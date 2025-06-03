
require('dotenv').config();
const { PDFDocument, rgb } = require('pdf-lib');
const { S3Client, PutObjectCommand } = require('@aws-sdk/client-s3');
const axios = require('axios'); // For fetching the image from the S3 URL
const SignModel = require('../models/signModel'); // Import the signModel for user data

const createPDF = async (userId) => {
  try {
    console.log("Bucket Name: ", process.env.AWS_S3_BUCKET_NAME);
    console.log("AWS Region: ", process.env.AWS_REGION);

    const bucketName = process.env.AWS_S3_BUCKET_NAME;
    if (!bucketName) {
      throw new Error("S3_BUCKET_NAME is missing from environment variables.");
    }

    // Fetch the user and their image
    const user = await SignModel.findOne({ userId });
    if (!user || !user.image) {
      throw new Error("User or image not found");
    }

    const imageUrl = user.image; // Assuming `image` contains the S3 URL
    console.log("User Image URL:", imageUrl);

    // Fetch the image as a buffer from the S3 URL
    const response = await axios.get(imageUrl, { responseType: 'arraybuffer' });
    const imageBuffer = Buffer.from(response.data);

    // Create a new PDFDocument (Now it's before image embedding)
    const pdfDoc = await PDFDocument.create();

    // Determine image format using Content-Type
    const contentType = response.headers['content-type'];
    let embedImage;
    if (contentType.includes('image/png')) {
      embedImage = await pdfDoc.embedPng(imageBuffer);
    } else if (contentType.includes('image/jpeg') || contentType.includes('image/jpg')) {
      embedImage = await pdfDoc.embedJpg(imageBuffer);
    } else {
      throw new Error('Unsupported image format. Only PNG and JPG/JPEG are allowed.');
    }

    let page = pdfDoc.addPage([600, 800]); // Adjusted page size for the text

    // Add header content to the PDF
    page.drawText('Agreement', {
      x: 50,
      y: 750,
      size: 20,
      color: rgb(0, 0.53, 0.71),
    });

    // Define the static text
    const text = `
    All deliveries will be made in the afternoon, starting from 2 PM, unless otherwise arranged. 
    The exact delivery time will correspond to your reservation. All pickups are scheduled for 8 AM unless specified differently. 
    Kindly ensure the cart is ready and fully charged by this time. If the cart is not at the designated drop-off location by 8 AM, 
    an additional fee of $75 will be charged for the driver to make a return trip.
    The valid and collectible liability insurance and personal injury protection insurance of any authorized rental or leasing driver 
    shall serve as the primary coverage for the liability and personal injury protection limits required under Sections 324.021(7) and 
    627.736 of the Florida Statutes. Failure to return rented property or equipment upon the expiration of the rental period, as well as 
    failure to pay all amounts due (including costs for damages), constitutes prima facie evidence of intent to defraud and is punishable 
    in accordance with Section 812.155 of the Florida Statutes.
     The Renter(s) attest that he/she is of at least 21 years of age and that he/she possesses a valid driver’s license and insurance as required by law. The operator(s)/renter(s) represents and warrants that he/she is insured under a policy of insurance which would provide coverage or injuries to the operator/renter and medical bills incurred as well as for damage to the person and property of others should an accident occur during the operation or use of the rented vehicle. The operator(s)/renter(s) attest that no other person shall drive the rental vehicle mentioned herein during the terms of this rental agreement or while rental vehicle is in possession of renter except for the authorized drivers . Notice: Rental and leasing drivers insurance to be primary. The valid and collective liability insurance and personal injury protection insurance of any authorized rental or leasing driver is primary to the limits of liability and personal injury coverage required by SS.324.021(7) and 627.736, Florida Statutes. -You are hereby notified that by signing this contract below, you agree that your own liability, personal injury protection and comp/collision will provide primary insurance coverage up to its full policy limits. -The renter agrees to return the rental property, or have ready for return, at the initial delivery address immediately upon completion of the rental period in condition equal to that in which it was received with normal wear and tear accepted. The renter agrees that if he or she has not returned said vehicle within 1 hour of the agreed upon time and at the above mentioned and agreed upon address, or is the vehicle is abandoned, he or she will bear all expenses incurred by South Walton Carts LLC in attempting to locate and recover said vehicle, and hereby waves all recourse against South Walton Carts LLC or other authority responsible for renter’s arrest or prosecution, even though the renter may consider such arrest or prosecution to be false, malicious or unjust. -In the event that the rental property becomes unsafe or in a state of disrepair, the Renter agrees to immediately discontinue use of property, and promptly notify South Walton Carts LLC. The renter understands that in the event the property shall become inoperable through no fault of the renter, South Walton Carts LLC will take reasonable steps to have the vehicle repaired or replaced. In the event a replacement is not available, the Rentor at his discretion may modify the rental agreement to reflect an adjustment of price on aprorated basis. -The renter(s)/operator(s) understand that a Low Speed Vehicle is a motorized vehicle that is only permitted on roads of 35 mph or less and ALL TRAFFIC LAWS MUST BE OBEYED. The renter(s)/operator(s) represent and warrant that he/she is familiar with the traffic rules, laws and regulations of the municipality wherein the rented vehicle is to be operated and will at all times comply strictly with the same. No driver under the age of 21 years old is allowed to drive.
Other Terms :
Acknowledgment of Receipt: The renter acknowledges receipt of the described personal property. Both parties agree that the renter inspected and accepted the property at the time of delivery, confirming it was in good and serviceable condition.
Liability for Loss or Damage: The renter agrees to pay for any loss or damage to the rental property, including all associated parts, attachments, keys, and tires. Tampering with, altering, or replacing any parts or components of the rental property is prohibited. If the rental property is found to have been tampered with or altered, the renter agrees to cover all repair costs and any costs associated with restoring the property, including loss of use. The renter's credit card or purchase order will be charged for any damages, theft, or loss on a “cash on demand” basis, up to the value of the rental property. Rental fees will continue to accrue until the lost rental property is paid in full.
Unauthorized or Misuse of Vehicle: If an unauthorized or underage driver operates the vehicle, or if the vehicle is misused resulting in damage or injury, all vehicles listed in this contract will be picked up, and no refund will be provided for the rental.
Vehicle Charge Responsibility: The renter accepts the rental property in its current state and is responsible for maintaining the proper charge of the vehicle. The vehicle must be returned fully charged. If not, a one-day rental fee of $125 will be charged to the renter's credit card.
Title and Ownership: The title to the rented property remains with the Rentor at all times. The renter acknowledges that they do not become an agent, servant, or employee of the Rentor. The vehicle is the rightful property of the Rentor, even if registered in a third party’s name. The Rentor is neither the manufacturer of the property nor its agent and does not provide a warranty against defects. The Rentor is not liable for any loss, delay, or damage resulting from defects or accidental breakage.
Seizure or Legal Actions: The renter must immediately notify the Rentor of any attempted levy or seizure of the rental property and indemnify the Rentor against losses or damages, including reasonable attorney fees and expenses.
- Indemnification: The renter agrees to indemnify and hold the Rentor harmless against any losses, damages, expenses, or penalties arising from any actions causing injury to persons or property during the rental period. The renter waives and releases the Rentor from all claims for injuries or damages caused by the use of the rental property.
- Legal Costs: Should collection or litigation become necessary to collect for damages or loss, the renter agrees to pay all fees, including attorney fees and court costs. Any claim under this agreement will be settled under Florida law, specifically in Okaloosa-Walton Counties. Walton County, FL will be the location for any arbitration or court settlement.
Renter’s Conduct: The renter agrees to exercise extreme caution while operating the rented vehicle, particularly during inclement weather, on crowded roadways, or in hazardous situations. The renter will not consume alcohol or engage in illegal activities while operating the vehicle. The renter understands that severe injuries may occur if an accident happens, and seat belts must be worn at all times. If observed operating the vehicle carelessly or dangerously, the renter will forfeit any deposit and assume any fines or penalties.
Severability: Should any paragraph or provision of this agreement violate the law and be unenforceable , the remainder of the agreement will remain valid.
By signing below, the renter agrees to adhere to the terms and conditions of this rental agreement, including all associated fees and charges.

You are responsible for any injury, damage, or loss caused to others. You agree to provide liability, collision, and comprehensive insurance that covers you, us, and the vehicle. If state law requires us to provide auto liability insurance, or if you do not have auto liability insurance, we will provide auto liability insurance (the “Policy”) that is secondary to any other valid and collectible insurance, whether primary, secondary, excess, or contingent. The Policy offers bodily injury and property damage liability coverage up to the minimum levels mandated by the vehicular financial responsibility laws of the state whose laws apply to the loss. You and we reject PIP, medical payments, no-fault, and uninsured or under-insured motorist coverage, where permitted by law. The Policy is void if you breach this agreement or fail to cooperate in a loss investigation conducted by us or our insurer. Allowing an unauthorized driver to operate the vehicle will also terminate coverage under the Policy.
Payment Section
The credit card provided will be used to charge you for the rental, damage deposit ($275.53), and any damage charges incurred. Please inspect the cart and report any existing damages before use. If a renter receives a parking ticket and does not pay it, a $250 fee will be charged in addition to the ticket amount by South Walton Carts LLC. A valid credit card must be on file to rent a cart and available at the time of rental. Failure to provide a valid card at the time of rental may delay or cancel the rental drop-off. By signing this contract, you authorize South Walton Carts LLC to charge the credit card used to book the rental through the rental software.

Cancellation Policy
Cancellations made at least 48 hours prior to the delivery date will not incur a cancellation fee, but a $100 paperwork fee will apply. Cancellations made less than 48 hours in advance will incur an additional $125 cancellation fee on top of the paperwork fee. South Walton Carts reserves the right to hold a $250 damage deposit on the provided credit card. A full refund of the deposit will be issued if the cart is returned undamaged, clean, and fully charged. Please allow 3-7 business days for the refund to be processed and returned to your account.

For comments or concerns, please let us know how we are doing by emailing us at mailto:southwaltongolfcartrentals@gmail.com with "OWNER" in the subject line.

If any damage occurs to the rented cart, other vehicles, or any third-party property, South Walton Carts LLC must be notified immediately, and a traffic report must be obtained. Any injury to the renter(s) or other parties must also be reported to South Walton Carts LLC as soon as possible.

Most damage is caused by underage drivers or drivers under the influence. If you plan on allowing either of these, please be aware that we will charge your card for all associated damages, labor costs, and any missed rental payments.

If underage drivers are observed operating the cart, it will result in immediate repossession of the cart, and no refunds will be issued.

Guidelines and Rules (PLEASE PRINT FOR YOUR RECORDS) PLEASE READ THIS CAREFULLY!!!
Obey all traffic laws while driving on the road. Please Google LSV laws in Florida or watch our safety video provided in your welcome email.
Seatbelts must be worn at all times. Infants must be secured in a car seat, and young children must use a booster seat. We do not provide these. Absolutely no lap sitting or riding is allowed.
The cart may only be driven on roads with speed limits of 35 mph or less. While most of CR-30A is 35 mph, HWY 98 and the roads leading north towards the highway are strictly off-limits.
Store the cart in a safe area and always take the key with you.
Keep the cart plugged in when not in use (electric carts only) and always return it fully charged and cleaned
No off-road or reckless driving. Avoid unpaved or upgraded roads. Failure to do so will result in a cleaning fee.
Do not drive on sidewalks, bike paths, or major highways.
Do not drive under the influence of drugs or alcohol.
Always park the cart in the appropriate parking space. If you receive a parking ticket, it must be paid before you leave town. Where acceptable, please park two carts in one parking space.
Under no circumstances are underage drivers allowed to operate the cart. No exceptions.
Do not store items on top of the cart. This will result in a $600 repaint fe
Do not place feet or shoes on the dashboard. This will result in a $250 fee.
Only store beach equipment with the rear seat flipped over. Placing equipment against painted areas will result in a repaint fee.
Before using the cart, please inspect it and take photos of any existing damage. All previous damage must be reported to us before using the cart to avoid damage charges to your credit card. Photos can be sent to mailto:southwaltongolfcartrentals@gmail.com or 850-797-0284.
Any damage caused by the renter must be reported with a traffic report as soon as possible.
I HAVE READ AND AGREE TO ALL GUIDELINES PUT IN PLACE IN THE ABOVE STATEMENT
Fees/Fines
Walton County law enforcement will issue fines for all violations of automobile laws. This is not a golf cart; it is an LSV (Low-Speed Vehicle) automobile.
Return cart uncharged: $125 fee.
Damaged or curbed wheel: $150 per wheel.
Lost key service call: $125, or $75 if you pick up a spare.
Unpaid parking violations: $250 plus the ticket amount. Call 850-892-8115 to pay the ticket before leaving town.
Labor on damaged carts: $135 per hour plus parts.
Tow fee for running the cart out of charge: $150. If after hours, call El Sankary Tow Company and ensure they use a flatbed.
Scratched roof: Minimum charge of $250, maximum charge of $750.
Service call: $125.
Extra dirty cart: $150 cleaning fee.
Feet on dash: $250 fee.
Tag holder replacement: $50.
Repaint center pod due to beach equipment being stored against it: $350.
Underage drivers will result in loss of rental and any money paid, along with a tow fee and labor fee to recover the cart.
I have read and accepted all the fees above.
Due to many carts being damaged from driving too fast on upgraded dirt roads, please avoid the following streets. If you are staying on one of these roads, please drive at less than 5 mph and avoid all potholes, mud puddles, and rough areas. The affected roads are

*  Canal Street
*  Dogwood Street
*  Forest Street
*  Thyme Street
*  Hickory Street
*  Live Oak Street
*  Nightcap Street
*  West Grove Street
*  East Grove Street
*  Holly Street
*  Azalea Street
*  Camelia Street
*  Gardenia Street
*  Birmingham Street
We will still rent to houses located on these streets.

By initializing this section, you acknowledge that if the renter does not avoid the roads listed above and returns a damaged or excessively dirty cart due to avoidable travel on these roads, extra fees will apply:

Front end alignment fee: $95 per cart.
Extra dirty cart wash fee: $150 per cart.
If you are staying on one of these roads or driving on them, please wash your cart off and drive slowly.

CHECK IN (Please print for your trip)
Upon arrival, if the cart is at the property, first check it for any damage. Take pictures of all pre-existing damage found on the cart. Common areas to inspect include the top of the roof, curbed wheels, scratches in the paint, and cracked rear steps. Report all damage, even if it seems minor, via text message or email with photos attached. We examine the carts before delivery and prior to pickup. Please note that 99% of renters claim the cart wasn’t in their possession when it was damaged. Unfortunately, we cannot rely on the honor system anymore. If we find damage after your rental during our inspection, we will notify you with pictures and the amount required to fix it. Claiming that the cart was not damaged while in your possession will not be accepted, as it is your responsibility to report any previous damage. Any scratches that remove paint, curbed wheels, or other damage must be reported. By signing this, you acknowledge that you understand and agree to these terms. South Walton Carts does not refund for missed rental time due to issues with the property’s outlet. If the rental unit’s breaker trips, please try another outlet or contact the property manager for repairs. After you have sent in the damage photos, you will find the keys to the cart located inside the front driver’s side wheel. This is also where you will leave the keys upon departure.

CHARGING INSTRUCTIONS (GAS CARTS DO NOT APPLY)
Most of our calls after the renter has received the cart are related to charging and runtime issues. Here are some helpful tips:

Electric carts are intended for short trips, not for all-day main transportation. When fully charged, you can expect to get 20-30 miles before it runs out of power. Most battery meters do not provide accurate readings. Always charge the cart whenever possible.
The cart needs to be plugged in whenever it is not in use—no exceptions. Ensure the 110 outlet has power. Cart chargers pull a lot of amperage, so it’s common for a house breaker to trip. If this happens, try another outlet on a different circuit, ideally one on the opposite side of the house or an interior outlet.
Most of our charging cords will light up to indicate that the 110 outlet has power. Once plugged in, locate the charger indicator light, usually on the dashboard, which should blink.
We do not come out past 5 PM to pick up carts that are out of charge. You have two options: park it somewhere safe until the next day or call a flatbed tow truck to have it towed home. Never push, pull, or have it towed without a flatbed, as this may cause internal motor damage resulting in a $1,500 replacement cost.
Please do not adjust the speaker bass and treble settings. Gas models will have enough fuel for the rental period.
Check Out Instructions:
Place the key inside the front driver’s side wheel.
Leave the cart on charge.
Wash off the cart if it is dirty and remove any trash from it.
Check the cart for any damage that you or your party may have caused, comparing it with the photos taken during your check-in procedures.
Please text 850-797-0284 to let us know that you have completed these steps and inform us if you caused any damage. If we find damage that has not been reported, you will receive a damage report detailing the charges that will be applied to the card on file.
You can either take your check-in photos or choose the option below for South Walton Carts to send a pre-delivery damage report.
We understand this may seem like a lot of rules, but our goal is to ensure our customers’ safety and maintain the quality of our rental fleet. Have a safe trip home, and thank you again for your business!

Check-in Damage Report Options
This agreement states that the responsible party will select and abide by one of the terms for the delivery of the rental cart. The responsible party must choose YES for one option and NO for the other. The first option is free, while the sec
Signature
    `;

    const fontSize = 12;
    const lineHeight = 16;
    const marginLeft = 50;
    const marginRight = 50;
    const textWidth = 600 - marginLeft - marginRight;
    let currentY = 720;

    const font = await pdfDoc.embedStandardFont('Helvetica');
    const wrappedLines = [];

    text.split('\n').forEach((paragraph) => {
      const words = paragraph.trim().split(' ');
      let line = '';
      words.forEach((word) => {
        const lineWidth = font.widthOfTextAtSize(line + word + ' ', fontSize);
        if (lineWidth > textWidth) {
          wrappedLines.push(line.trim());
          line = word + ' ';
        } else {
          line += word + ' ';
        }
      });
      if (line.trim() !== '') {
        wrappedLines.push(line.trim());
      }
      wrappedLines.push(''); // Add blank line between paragraphs
    });

    wrappedLines.forEach((line) => {
      if (currentY < 50) {
        page = pdfDoc.addPage([600, 800]);
        currentY = 750;
      }
      page.drawText(line, { x: marginLeft, y: currentY, size: fontSize, color: rgb(0, 0, 0) });
      currentY -= lineHeight;
    });

    // Embed the user image (making the image smaller and aligning it to the right side)
    const scaleFactor = 0.3; // Scale image to 30% of its original size
    const { width, height } = embedImage.scale(scaleFactor);

    // Calculate the position for the image on the right-hand side
    const imageXPosition = 600 - width - 20; // Right alignment with 20px margin
    const imageYPosition = currentY - height - 20; // Position image just below the text

    // If currentY is too low to fit the image, create a new page
    if (imageYPosition < 50) {
      page = pdfDoc.addPage([600, 800]);
      currentY = 750; // Reset Y position for the new page
    }

    // Add the "Signature" text above the image
    const signatureText = "Signature";
    const signatureTextFontSize = 12; // Font size for the signature text
    const signatureTextWidth = font.widthOfTextAtSize(signatureText, signatureTextFontSize);
    const textXPosition = imageXPosition + (width / 2) - (signatureTextWidth / 2); // Center the text above the image
    const textYPosition = imageYPosition + height + 5; // Position the text slightly above the image

    page.drawText(signatureText, {
      x: textXPosition,
      y: textYPosition,
      size: signatureTextFontSize,
      color: rgb(0, 0, 0),
    });

    // Add the image to the PDF on the right-hand side
    page.drawImage(embedImage, {
      x: imageXPosition,
      y: imageYPosition,
      width,
      height,
    });

    // Save the PDF to a buffer
    const pdfBytes = await pdfDoc.save();

    const fileName = `User_${userId}_ImportantInformation.pdf`;
    const s3 = new S3Client({
      region: process.env.AWS_REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });

    const uploadParams = {
      Bucket: bucketName,
      Key: fileName,
      Body: Buffer.from(pdfBytes),
      ContentType: 'application/pdf',
    };

    console.log('Uploading file with parameters:', uploadParams);

    // Upload to S3
    const result = await s3.send(new PutObjectCommand(uploadParams));
    const fileUrl = `https://${bucketName}.s3.${process.env.AWS_REGION}.amazonaws.com/${fileName}`;
    console.log(`PDF uploaded successfully: ${fileUrl}`);

    // Update the user's record in the database with the PDF URL
    user.pdf = fileUrl;
    await user.save();
    console.log('User record updated with PDF URL:', fileUrl);

    return {
      message: 'PDF uploaded successfully and link saved to database',
      url: fileUrl,
    };
  } catch (error) {
    console.error('Error generating or uploading PDF:', error);
    throw new Error('PDF generation or upload failed');
  }
};

module.exports = { createPDF };
