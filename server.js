const express = require('express');
const app = express();
const Razorpay = require('razorpay');
const cors = require('cors');
const nodemailer = require('nodemailer');
require('dotenv').config();

// Razorpay instance
const razorpay = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID || 'rzp_test_v48Xg7GtP96NU1',
    key_secret: process.env.RAZORPAY_SECRET_KEY || 'I2oMcNmpOkgTwl1tq9WYDXuR'
});

// Middleware
app.use(cors({
  origin: ['https://fascinating-tulumba-75c61f.netlify.app'], // ✅ Allow your frontend URL
  credentials: true
}));
app.use(express.json());

// --- REMOVE or COMMENT these lines ---
// app.use(express.static(path.join(__dirname, '../frontend')));
// app.get('/', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend', 'place-order.html'));
// });
// app.get('/success', (req, res) => {
//     res.sendFile(path.join(__dirname, '../frontend', 'success.html'));
// });

// ✅ Add a simple Home Route (Optional, for testing)
app.get('/', (req, res) => {
    res.send('Backend API is Running Successfully ✅');
});

// Create Razorpay Order
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

// Payment Success
let processedOrders = new Set();  // Store processed Order IDs temporarily

app.post('/success', (req, res) => {
    console.log('Received order details:', req.body);

    const { orderDetails, paymentMethod } = req.body;

    if (!orderDetails) {
        return res.status(400).json({ message: 'Order details are missing' });
    }

    const uniqueOrderId = `${orderDetails.customer.phone}-${orderDetails.totalPrice}`;

    // Check if this order already processed
    if (processedOrders.has(uniqueOrderId)) {
        console.log('Duplicate order detected, ignoring...');
        return res.status(200).json({ message: 'Duplicate order ignored' });
    }

    // Mark this order as processed
    processedOrders.add(uniqueOrderId);

    // Send the email
    sendEmail(orderDetails)
        .then(() => {
            res.status(200).json({ message: 'Order email sent successfully' });
        })
        .catch(err => {
            console.error('Error sending email:', err);
            res.status(500).json({ message: 'Error sending email' });
        });
});


// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
