const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { totalmem } = require('os');

const app = express();
const PORT = 5000;

app.use(cors());
app.use(bodyParser.json());

app.post('/api/print', (req, res) => {
    const { companyName, address, city, state, gstno, stateCode, invoiceNo, poNumber, poDate, invoiceDate, items } = req.body;

    let totalAmount = 0
    let totalQuantity = 0

    items.forEach((item) => {
        totalQuantity += parseInt(item.quantity)
        totalAmount += item.price * item.quantity
    });

    const sgst = totalAmount *0.09
    const cgst = totalAmount * 0.09

    function numberToWords(num) {
        const belowTwenty = [
            "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine",
            "Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", 
            "Seventeen", "Eighteen", "Nineteen"
        ];
        const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
        const aboveThousand = ["", "Thousand", "Lakh", "Crore"];
    
        if (num === 0) return "Zero";
    
        function convertToWords(n) {
            if (n < 20) {
                return belowTwenty[n];
            } else if (n < 100) {
                return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + belowTwenty[n % 10] : "");
            } else if (n < 1000) {
                return belowTwenty[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " and " + convertToWords(n % 100) : "");
            }
            return "";
        }
    
        let parts = [];
        let units = [10000000, 100000, 1000, 1];
        let unitNames = ["Crore", "Lakh", "Thousand", ""];
    
        for (let i = 0; i < units.length; i++) {
            let divisor = units[i];
            if (num >= divisor) {
                let part = Math.floor(num / divisor);
                num %= divisor;
                if (part > 0) {
                    parts.push(convertToWords(part) + (unitNames[i] ? " " + unitNames[i] : ""));
                }
            }
        }
    
        return parts.join(" ").trim();
    }
    
    const totalRows = 7

    function adjustToNearestWhole(amount) {
        const rounded = Math.round(amount); // Round to the nearest whole number
        const difference = (rounded - amount).toFixed(2); // Calculate the difference
        
        return {
            roundedTotal: rounded,
            adjustment: difference > 0 ? `+${difference}` : difference, // Add "+" if positive
        };
    }

    const totalAdjusted = adjustToNearestWhole(totalAmount + sgst + cgst)
    const amountInWords = numberToWords(totalAdjusted.roundedTotal)

    const htmlContent = `
        <!DOCTYPE html>
        <html lang="en">
        <head>
            <meta charset="UTF-8">
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <title>Invoice</title>
            <style>
                body {
                    font-family: Arial, sans-serif;
                    margin: 0;
                    padding: 0px;
                    font-size: small;
                }
                .invoice {
                    border: solid 2px black;
                }
                .header {
                    display: flex;
                }
                .header .logo {
                    display: flex;
                    justify-content: center;
                    align-items: center;
                    border-bottom: solid 2px black;
                    border-right: solid 2px black;
                }
                .header .logo img {
                    height: 150px;
                    width: 150px;
                }
                .header .company-details {
                    width: 100%;
                    border-bottom: solid 2px black;
                    text-align: center;
                }
                .tocompany {
                    display: flex;
                }
                .tocompany .customer-details {
                    width: 70%;
                    padding-left: 10px;
                    border-right: solid 2px black;
                    border-bottom: solid 2px black;
                }
                .tocompany .customer-details p, h3 {
                    padding-left: 25px;
                }
                .tocompany .customer-details .gst {
                    margin: 0px;
                    padding-right: 10px;
                    padding-left: 25px;
                    display: flex;
                    justify-content: space-between;
                    height: fit-content;
                }
                .tocompany .invoice-details {
                    width: 30%;
                    border-bottom: solid 2px black;
                }
                .tocompany .invoice-details .tax {
                    text-align: center;
                    border-bottom: solid 2px black;
                }
                .tocompany .invoice-details .inv {
                    border-bottom: solid 2px black;
                }
                .tocompany .invoice-details .inv, .tocompany .invoice-details .po {
                    padding-left: 10px;
                } 
                .bill {
                    height: 270px;
                    border-bottom: solid 2px black;
                }
                .bill table {
                    width: 100%;
                    border-collapse: collapse;
                }
                .bill th {
                    border: 2px solid black;
                }
                .bill table, .bill td {
                    border-left: 2px solid black;
                    border-right: 2px solid black;
                }
                .bill th, .bill td {
                    padding: 8px;
                    text-align: center;
                }
                .bank-total {
                    display: flex;
                    font-weight: bold;
                    border-bottom: solid 2px black;
                }
                .bank {
                    width: 72%;
                    display: flex;
                    justify-content: space-between;
                    padding-right: 32px;
                    padding-left: 10px;
                    border-right: solid 2px black;

                }
                .total {
                    width: 30%;
                    display: flex;
                    padding-right: 10px;
                    padding-left: 10px;
                    justify-content: space-between;
                }
                .bank-tax {
                    display: flex;
                    font-weight: bold;
                    border-bottom: solid 2px black;
                }
                .bank-details {
                    width: 70%;
                    padding-left: 10px;
                    border-right: solid 2px black;
                }
                .tax-gst {
                    width: 30%;
                }
                .tax-gst span {
                    display: flex;
                    justify-content: space-between;
                    margin-top: -10px;
                    padding-left: 10px;
                    padding-right: 10px;
                }
                .total-word {
                    display: flex;
                    font-weight: bold;
                    border-bottom: solid 2px black;
                }
                .amount-word {
                    width: 70%;
                    padding-left: 10px;
                    border-right: solid 2px black;
                }
                .grand-total {
                    width: 30%;
                }
                .grand-total span{
                    display: flex;
                    justify-content: space-between;
                    padding-left: 10px;
                    padding-right: 10px;
                }
                .tc-sign {
                    display: flex;
                    font-weight: bold;
                }
                .tc {
                    width: 60%;
                    padding-left: 10px;
                    border-right: solid 2px black;
                }
                .fp-sign {
                    width: 20%;
                    display: flex;
                    flex-direction: column;
                    justify-content: flex-end;
                    align-items: center;
                    border-right: solid 2px black;
                }
                .customer-sign {
                    width: 20%;
                    display: flex;
                    flex-direction: column;
                    justify-content: space-between;
                    align-items: center;
                }
                .col {
                    width: 10%;
                }
                .spl {
                    font-size: 20px;
                    font-weight: bold;
                }
            </style>
        </head>
        <body>
            <div class="invoice">
                <div class="header">
                    <div class="logo">
                        <img src="logo.png" alt="Company Logo">
                    </div>
                    <div class="company-details">
                        <h1>FRIENDS PACKS</h1>
                        <p>6-A Jeeva Colony(Extn.), A V P LAYOUT 3rd STREET, GANDHINAGAR (PO), TIRUPUR-641603</p>
                        <p>Email: friendspacks74@gmail.com, PHONE: 0421 4333524, MOBILE: 9443373524</p>
                        <p>GSTIN: 33AGGPR1091N1Z3, STATE: TAMIL NADU, STATE CODE: 33</p>
                    </div>
                </div>
                <div class="tocompany">
                    <div class="customer-details">
                        <h2>To</h2>
                        <h3>M/s: ${companyName},</h3>
                        <p>${address},</p>
                        <p>${city},</p>
                        <p>${state}.</p>
                        <div class="gst">
                            <h4>GSTIN: ${gstno}</h4>
                            <h4>STATE CODE: ${stateCode}</h4>
                        </div>
                    </div>
                    <div class="invoice-details">
                        <h3 class="tax">TAX INVOICE</h3>
                        <div class="inv">
                            <h3>Invoice No: <span class="spl">${invoiceNo}</span></h3>
                            <h3>Date: <span class="spl">${invoiceDate}</span></h3>
                        </div>
                        <div class="po">
                            <h3>PO No: <span class="spl">${poNumber}</span></h3>
                            <h3>Date: <span class="spl">${poDate}</span></h3>
                        </div>
                    </div>
                </div>
                <div class="bill">
                    <table>
                        <thead>
                            <tr>
                                <th class="col">S.No</th>
                                <th class="col">HSN Code</th>
                                <th class="col">DC No</th>
                                <th class="column">Description</th>
                                <th class="col">Quantity (Kgs/Nos)</th>
                                <th class="col">Rate</th>
                                <th class="col">Amount Rs.   Ps</th>
                            </tr>
                        </thead>
                        <tbody>
                        ${items.map((item, index) => `
                            <tr>
                                <td>${index + 1}</td>
                                <td>${item.hsnCode}</td>
                                <td>${item.dcNumber}</td>
                                <td>${item.name}</td>
                                <td>${item.quantity}</td>
                                <td>${parseFloat(item.price).toFixed(2)}</td>
                                <td>${(parseFloat(item.price) * parseInt(item.quantity)).toFixed(2)}</td>
                            </tr>
                        `).join('')}
                        ${Array.from({ length: Math.max(0, totalRows - items.length) }).map(() => `
                            <tr>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                                <td>&nbsp;</td>
                            </tr>
                        `).join('')}
                        </tbody>
                    </table>
                </div>
                <div class="footer">
                    <div class="bank-total">
                        <div class="bank">
                            <p>BANK RTGS DETAILS</p>
                            <p>TOTAL</p>
                        </div>
                        <div class="total">
                            <p>${totalQuantity} Nos</p>
                            <p>${parseFloat(totalAmount).toFixed(2)}</p>
                        </div>
                    </div>
                    <div class="bank-tax">
                        <div class="bank-details">
                            <p>Bank Name: HDFC BANK LTD,</p>
                            <p>Account No: 50200014924572</p>
                            <p>IFSC Code: HDFC0002408</p>
                            <p>Branch: INDIRA NAGAR BRANCH, TIRUPPUR</p>
                        </div>
                        <div class="tax-gst">
                            <span>
                                <p>Taxable Amount:</p>
                                <p>${parseFloat(totalAmount).toFixed(2)}</p>
                            </span>
                            <span>
                                <p>SGST@9%:</p>
                                <p>${parseFloat(sgst).toFixed(2)}</p>
                            </span>
                            <span>
                                <p>CGST@9%:</p>
                                <p>${parseFloat(cgst).toFixed(2)}</p>
                            </span>
                            <span>
                                <p>Rounded Off:</p>
                                <p>${totalAdjusted.adjustment}</p>
                            </span>
                        </div>
                    </div>
                    <div class="total-word">
                        <div class="amount-word">
                            <p>AMOUNT IN WORDS:</p>
                            <p>Rupees ${amountInWords} only</p>
                        </div>
                        <div class="grand-total">
                            <span>
                                <p>GRAND TOTAL:</p>
                                <h3>${parseFloat(totalAdjusted.roundedTotal).toFixed(2)}</h3>
                            </span>
                        </div>
                    </div>
                    <div class="tc-sign">
                        <div class="tc">
                            <p>Terms & Condition:</p>
                            <p>* Goods once sold cannot be taken back</p>
                            <p>* The payment should be made only way of crossed Draft/ Cheque in favour of FRIENDS PACKS.</p>
                            <p>* All disputes subject to tirupur jurisdiction only.</p>
                        </div>
                        <div class="fp-sign">
                            <p>Receiver Signature</p>
                        </div>
                        <div class="customer-sign">
                            <h4>For FRIENDS PACKS</h4>
                            <p>Authorised Signature</p>
                        </div>
                    </div>
                </div>
            </div>
        </body>
        </html>
    `;

    const filePath = path.join(__dirname, 'invoice.html');
    fs.writeFileSync(filePath, htmlContent);

    const printCommand = process.platform === 'win32'
    ? `print /d:EPSON L130 Series "${filePath}"`
    : `lp ${filePath}`;
    exec(printCommand, (error) => {
        if (error) {
            console.error('Error printing:', error);
            res.status(500).send({ message: 'Error printing the document' });
        } else {
            res.send({ message: 'Document printed successfully' });
        }
    });
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
