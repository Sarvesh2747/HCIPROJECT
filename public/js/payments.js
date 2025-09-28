document.addEventListener('DOMContentLoaded', () => {
    const payButtons = document.querySelectorAll('.pay-now-btn');

    payButtons.forEach(button => {
        button.addEventListener('click', async (event) => {
            const invoiceId = event.target.dataset.invoiceId;
            
            try {
                // Step 1: Create Order on Server
                const response = await fetch('/billing/payments/online/create-order', {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                    },
                    body: JSON.stringify({ invoice_id: invoiceId })
                });

                if (!response.ok) {
                    throw new Error('Failed to create payment order.');
                }

                const orderDetails = await response.json();

                // Step 2: Open Razorpay Checkout
                const options = {
                    key: orderDetails.key_id,
                    amount: orderDetails.amount, 
                    currency: orderDetails.currency,
                    name: "HCIPROJECT",
                    description: `Payment for Invoice #${invoiceId}`,
                    order_id: orderDetails.order_id,
                    handler: function (response) {
                        // Step 3: Verify Payment on Server
                        verifyPaymentOnServer(response, orderDetails.order_id);
                    },
                    prefill: {
                        // We can prefill user details here later
                    },
                    theme: {
                        color: "#3399cc"
                    }
                };

                const rzp = new Razorpay(options);
                rzp.open();

            } catch (error) {
                console.error('Payment Error:', error);
                alert('Could not initiate payment. Please try again.');
            }
        });
    });
});

async function verifyPaymentOnServer(paymentResponse, orderId) {
    try {
        const response = await fetch('/billing/payments/online/verify', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                razorpay_payment_id: paymentResponse.razorpay_payment_id,
                razorpay_order_id: paymentResponse.razorpay_order_id,
                razorpay_signature: paymentResponse.razorpay_signature,
                invoice_order_id: orderId // The order_id from our server
            })
        });

        if (!response.ok) {
            throw new Error('Payment verification failed.');
        }

        // Redirect to payment history page to see the updated status
        window.location.href = '/student/payments?payment=success';

    } catch (error) {
        console.error('Verification Error:', error);
        alert('Payment verification failed. Please contact support.');
    }
}
