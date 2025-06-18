import paytmchecksum from '../paytm/PaytmChecksum.js';
import dotenv from 'dotenv';
import formidable from 'formidable';
import https from 'https';

dotenv.config(); // Load environment variables

const paytmMerchantkey = process.env.PAYTM_MERCHANT_KEY;

export const addPaymentGateway = async (request, response) => {
    try {
        const paytmParams = {
            MID: 'YOUR_MID_HERE',
            WEBSITE: 'YOUR_WEBSITE_HERE',
            CHANNEL_ID: 'YOUR_CHANNEL_ID',
            INDUSTRY_TYPE_ID: 'YOUR_INDUSTRY_ID',
            ORDER_ID: 'YOUR_ORDER_ID',
            CUST_ID: 'YOUR_CUST_ID',
            TXN_AMOUNT: 'YOUR_AMOUNT',
            CALLBACK_URL: 'http://localhost:8000/callback',
            EMAIL: 'user@example.com',
            MOBILE_NO: '9999999999'
        };

        const paytmCheckSum = await paytmchecksum.generateSignature(paytmParams, paytmMerchantkey);

        const params = {
            ...paytmParams,
            'CHECKSUMHASH': paytmCheckSum
        };

        response.json(params);
    } catch (error) {
        console.log('Error in addPaymentGateway:', error);
        response.status(500).json({ error: 'Payment gateway error' });
    }
};

export const paymentResponse = async (request, response) => {
    const form = new formidable.IncomingForm();

    form.parse(request, async (err, fields, files) => {
        if (err) {
            console.log('Form parse error:', err);
            return response.status(400).json({ error: 'Invalid form data' });
        }

        const paytmCheckSum = fields.CHECKSUMHASH;
        delete fields.CHECKSUMHASH;

        const isVerifySignature = await paytmchecksum.verifySignature(fields, paytmMerchantkey, paytmCheckSum);

        if (isVerifySignature) {
            const paytmParams = {
                MID: fields.MID,
                ORDERID: fields.ORDERID
            };

            const checksum = await paytmchecksum.generateSignature(paytmParams, paytmMerchantkey);
            paytmParams.CHECKSUMHASH = checksum;

            const post_data = JSON.stringify(paytmParams);

            const options = {
                hostname: 'securegw-stage.paytm.in',
                port: 443,
                path: '/order/status',
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Content-Length': post_data.length
                }
            };

            let res = "";
            const post_req = https.request(options, function (post_res) {
                post_res.on('data', function (chunk) {
                    res += chunk;
                });

                post_res.on('end', function () {
                    let result = JSON.parse(res);
                    console.log(result);
                    response.redirect(`http://localhost:3000/`);
                });
            });

            post_req.write(post_data);
            post_req.end();
        } else {
            console.log("Checksum Mismatched");
            response.status(403).json({ error: 'Checksum Mismatched' });
        }
    });
};
