const express = require('express');
const { User, Account } = require('../db');
const jwt = require('jsonwebtoken');
const zod = require('zod');
const { JWT_SECRET } = require('../config');
const { authMiddleware } = require('../middleware');

const router = express.Router();

const signupSchema = zod.object({
    username: zod.string().email(),
    firstName: zod.string().max(50),
    lastName: zod.string().max(50),
    password: zod.string().min(6)
});


// user signup route
router.post('/signup', async (req, res) => {
    const { success } = signupSchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid Data"
        })
    }

    const existingUser = await User.findOne({ username: req.body.username});
    if (existingUser) {
        return res.status(409).json({
            message: "User already exists"
        });
    }
    else {
        const newUser = await User.create({
            username: req.body.username,
            firstName: req.body.firstName,
            lastName: req.body.lastName,
            password: req.body.password
        });
        
        const newUserId = newUser._id;
    
        // create a bank account for the user
        await Account.create({
            userId: newUserId,
            balance: Math.ceil(1 + Math.random() * 100000)
        });
    
        const jwtToken = jwt.sign({
            userId: newUserId
        }, JWT_SECRET);
    
        res.status(201).json({
            message: "New User created successfully!",
            token: jwtToken
        });
    }
})

const signInSchema = zod.object({
    username: zod.string().email(),
    password: zod.string().min(6)
});

// user login route
router.post('/signin', async (req, res) => {
    const { success } = signInSchema.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid Credentials"
        })
    }

    //checking if user exists in database
    const user = await User.findOne({
            username: req.body.username
    });

    if (!user) {
        return res.status(404).json({
            message: "User not found"
        });
    }

    // validating password
    if (user.password !== req.body.password) {
        return res.status(401).json({
            message: "Invalid Credentials"
        });
    }

    const userId = user._id;

    const jwtToken = jwt.sign({
        userId: userId
    }, JWT_SECRET);

    return res.status(200).json({
        message: "User logged in successfully!",
        token: jwtToken
    });

})

const updateUser = zod.object({
    firstName: zod.string().max(50).optional(),
    lastName: zod.string().max(50).optional(),
    password: zod.string().min(6).optional()
});

// user information update route
router.put('/', authMiddleware, async (req, res) => {
    const { success } = updateUser.safeParse(req.body);
    if (!success) {
        return res.status(411).json({
            message: "Invalid Data/ Error while updating user info"
        });
    }

    const userId = req.userId;
    await User.updateOne({ _id: userId }, req.body);
    return res.json({
        message: "User updated successfully!"
    })
})

// users fetch route
router.get('/bulk', async (req, res) => {
    const filter = req.query.filter || "";
    const users = await User.find({
        $or: [
            { firstName: { $regex: filter, $options: 'i' } },
            { lastName: { $regex: filter, $options: 'i' } }
        ]
    })

    return res.json({
        user : users.map(user => ({
            id: user._id,
            username: user.username,
            firstName: user.firstName,
            lastName: user.lastName
        }))
    })

})

module.exports = router;
