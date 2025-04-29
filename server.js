const express = require('express');
const app = express();
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_WudjubkREr0jzx',
    key_secret: process.env.RAZORPAY_SECRET_KEY || 'J3TON1JqTaEcomqp6zXovYIW'
});

// Middleware
app.use(cors({
  origin: ['https://fascinating-tulumba-75c61f.netlify.app'],
  credentials: true
}));
app.use(express.json());

// ✅ Test route
app.get('/', (req, res) => {
    res.send('Backend API is Running Successfully ✅');
});

// ✅ Create Razorpay Order
app.post('/create-order', async (req, res) => {
    const { amount } = req.body;
    console.log('Received amount for order:', amount);

    // Validate amount
    if (!amount || typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Invalid or missing amount in request body' });
    }

    try {
        const order = await razorpay.orders.create({
            amount: amount, // Must be in paise
            currency: "INR",
            receipt: "receipt_order_" + Math.floor(Math.random() * 1000000)
        });
        res.json(order);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).json({
            error: 'Error creating Razorpay order',
            details: err.message
        });
    }
});

// ✅ Email sending function
async function sendEmail(orderDetails) {
    const transporter = nodemailer.createTransport({
        service: 'gmail',
        auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASS,
        },
    });

    const mailOptions = {
        from: process.env.EMAIL_USER,
        to: process.env.EMAIL_TO,
        subject: 'New Order Details',
        text: `
            Order Details:
            Name: ${orderDetails.customer.name}
            Email: ${orderDetails.customer.email}
            Phone: ${orderDetails.customer.phone}
            Address: ${orderDetails.customer.address}
            Pincode: ${orderDetails.customer.pincode}

            Total Price: ₹${orderDetails.totalPrice}

            Payment Status: ${orderDetails.paymentStatus}

            Cart Items:
            ${orderDetails.cart.map(item => `${item.name} (₹${item.price} x ${item.quantity})`).join(', ')}
        `,
    };

    try {
        await transporter.sendMail(mailOptions);
    } catch (err) {
        throw new Error('Error sending email: ' + err.message);
    }
}

// ✅ Payment success route
let processedOrders = new Set();

app.post('/success', (req, res) => {
    console.log('Received order details:', req.body);

    const { orderDetails, paymentMethod } = req.body;

    if (!orderDetails) {
        return res.status(400).json({ message: 'Order details are missing' });
    }

    const uniqueOrderId = `${orderDetails.customer.phone}-${orderDetails.totalPrice}`;

    if (processedOrders.has(uniqueOrderId)) {
        console.log('Duplicate order detected, ignoring...');
        return res.status(200).json({ message: 'Duplicate order ignored' });
    }

    processedOrders.add(uniqueOrderId);

    sendEmail(orderDetails)
        .then(() => {
            res.status(200).json({ message: 'Order email sent successfully' });
        })
        .catch(err => {
            console.error('Error sending email:', err);
            res.status(500).json({ message: 'Error sending email' });
        });
});

// ✅ Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
