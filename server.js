const express = require('express');
const app = express();
const Razorpay = require('razorpay');
const path = require('path');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_v48Xg7GtP96NU1',
    key_secret: process.env.RAZORPAY_SECRET_KEY || 'I2oMcNmpOkgTwl1tq9WYDXuR'
});

// Middleware
app.use(cors());
app.use(express.json());

// Serve static files from 'frontend' folder (adjusted to be at the same level as 'backend')
app.use(express.static(path.join(__dirname, '../frontend')));

// Routes
app.get('/', (req, res) => {
    // Serve the place-order.html from the 'frontend' folder
    res.sendFile(path.join(__dirname, '../frontend', 'place-order.html'));
});

app.post('/create-order', async (req, res) => {
    const { amount } = req.body;
    try {
        const order = await razorpay.orders.create({
            amount: amount,
            currency: "INR",
            receipt: "receipt_order_" + Math.floor(Math.random() * 100)
        });
        res.json(order);
    } catch (err) {
        console.error('Error creating order:', err);
        res.status(500).send('Error creating order');
    }
});

// Email sending function using Nodemailer
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

// Payment success route
app.post('/success', (req, res) => {
    console.log('Received order details:', req.body);

    const { orderDetails } = req.body;

    if (!orderDetails) {
        return res.status(400).json({ message: 'Order details are missing' });
    }

    sendEmail(orderDetails)
        .then(() => {
            res.status(200).json({ message: 'Order details sent successfully' });
        })
        .catch(err => {
            console.error('Error sending email:', err);
            res.status(500).json({ message: 'Error sending email' });
        });
});

app.get('/success', (req, res) => {
    // Serve success.html from the 'frontend' folder
    res.sendFile(path.join(__dirname, '../frontend', 'success.html'));
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
