const express = require('express');
const mongoose = require('mongoose');
const { authMiddleware } = require('../middleware');
const { Account } = require('../db');
const router = express.Router();

// get account balance
router.get('/balance', authMiddleware, async (req, res) => {
    const account = await Account.findOne({userId: req.userId});
    console.log(account);
    res.json({
        balance: account.balance
    });
})

// deposit money
router.post('/transfer', authMiddleware, async (req, res) => {
    const session = await mongoose.startSession();

    session.startTransaction();
    const { amount , receiverId } = req.body;

    // fetching the transaction accounts
    const senderAccount = await Account.findOne({userId: req.userId}).session(session);
    console.log(senderAccount)

    const receiverAccount = await Account.findOne({userId: receiverId}).session(session);
    console.log(receiverAccount)

    // checking if the sender account exists
    if (!senderAccount) {
        await session.abortTransaction();
        return res.status(404).json({
            message: "Sender account not found"
        });
    }
    // checking if the sender has enough balance
    if (senderAccount.balance < amount) {
        await session.abortTransaction();
        return res.status(400).json({
            message: "Insufficient balance"
        });
    }

    // checking if the receiver account exists
    if(!receiverAccount){
        await session.abortTransaction();
        return res.status(404).json({
            message: "Receiver account not found"
        });
    }

    // no error, proceed with the transaction
    await Account.updateOne({
            userId: req.userId
        },
        {
        balance: senderAccount.balance - amount
    }).session(session);
    await Account.updateOne({
            userId: receiverId
        },
        {
        balance: receiverAccount.balance + amount
    }).session(session);

    // commint the transaction
    await session.commitTransaction();
    session.endSession();

    res.json({
        message: "Transaction successful"
    });
});

module.exports = router;