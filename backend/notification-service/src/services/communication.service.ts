import nodemailer from "nodemailer";
import twilio from "twilio";
import { INotification } from "../models/notification.model";
import { INotificationPreference } from "../models/notificationPreference.model";
import { UserDetails } from "./external.service";
import { logger } from "../utils/logger";

export interface CommunicationResult {
    success: boolean;
    messageId?: string;
    sid?: string;
    error?: string;
}

export class CommunicationService {
    private emailTransporter: nodemailer.Transporter;
    private twilioClient: twilio.Twilio;

    constructor() {
        // Email configuration
        this.emailTransporter = nodemailer.createTransporter({
            service: process.env.EMAIL_SERVICE || "gmail",
            auth: {
                user: process.env.EMAIL_USER,
                pass: process.env.EMAIL_PASSWORD,
            },
        });

        // Twilio configuration
        this.twilioClient = twilio(
            process.env.TWILIO_ACCOUNT_SID,
            process.env.TWILIO_AUTH_TOKEN
        );
    }

    public async sendThroughChannels(
        notification: INotification,
        userDetails: UserDetails,
        preferences: INotificationPreference,
        subject: string
    ): Promise<void> {
        // Send Email
        if (preferences.email && userDetails.email) {
            const emailResult = await this.sendEmailNotification(
                userDetails.email,
                subject,
                notification.message,
                preferences.language
            );

            notification.channels.email.sent = emailResult.success;
            notification.channels.email.status = emailResult.success
                ? "sent"
                : "failed";
            notification.channels.email.sentAt = new Date();
            if (!emailResult.success) {
                notification.channels.email.error = emailResult.error;
            }
        }

        // Send SMS
        if (preferences.sms && userDetails.phone) {
            const smsResult = await this.sendSMSNotification(
                userDetails.phone,
                notification.message,
                preferences.language
            );

            notification.channels.sms.sent = smsResult.success;
            notification.channels.sms.status = smsResult.success
                ? "sent"
                : "failed";
            notification.channels.sms.sentAt = new Date();
            notification.channels.sms.twilioSid = smsResult.sid;
            if (!smsResult.success) {
                notification.channels.sms.error = smsResult.error;
            }
        }

        // Send Voice Call
        if (preferences.voice && userDetails.phone) {
            const voiceResult = await this.sendVoiceNotification(
                userDetails.phone,
                notification.message,
                preferences.voiceType,
                preferences.language
            );

            notification.channels.voice.sent = voiceResult.success;
            notification.channels.voice.status = voiceResult.success
                ? "sent"
                : "failed";
            notification.channels.voice.sentAt = new Date();
            notification.channels.voice.twilioSid = voiceResult.sid;
            if (!voiceResult.success) {
                notification.channels.voice.error = voiceResult.error;
            }
        }

        // Send Push Notification
        if (preferences.push) {
            const pushResult = await this.sendPushNotification(
                notification.userId,
                subject,
                notification.message,
                preferences.language
            );

            notification.channels.push.sent = pushResult.success;
            notification.channels.push.status = pushResult.success
                ? "sent"
                : "failed";
            notification.channels.push.sentAt = new Date();
            if (!pushResult.success) {
                notification.channels.push.error = pushResult.error;
            }
        }
    }

    public async sendEmailNotification(
        to: string,
        subject: string,
        text: string,
        language: string = "en"
    ): Promise<CommunicationResult> {
        try {
            const mailOptions = {
                from: process.env.EMAIL_FROM || "healthcare@example.com",
                to,
                subject,
                text,
                html: this.generateEmailTemplate(subject, text),
            };

            const result = await this.emailTransporter.sendMail(mailOptions);
            logger.info(`Email sent successfully to ${to}`, {
                messageId: result.messageId,
            });
            return { success: true, messageId: result.messageId };
        } catch (error: any) {
            logger.error("Error sending email:", error);
            return { success: false, error: error.message };
        }
    }

    public async sendSMSNotification(
        to: string,
        message: string,
        language: string = "en"
    ): Promise<CommunicationResult> {
        try {
            const result = await this.twilioClient.messages.create({
                body: message,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to,
                statusCallback: `${process.env.BASE_URL}/notifications/twilio/sms-status`,
            });

            logger.info(`SMS sent successfully to ${to}`, { sid: result.sid });
            return { success: true, sid: result.sid };
        } catch (error: any) {
            logger.error("Error sending SMS:", error);
            return { success: false, error: error.message };
        }
    }

    public async sendVoiceNotification(
        to: string,
        message: string,
        voiceType: string = "text_to_speech",
        language: string = "en"
    ): Promise<CommunicationResult> {
        try {
            let twiml: string;

            if (voiceType === "recorded" || voiceType === "both") {
                // Use recorded message if available
                const recordingUrl =
                    process.env.RECORDING_BASE_URL +
                    `/recording_${language}.mp3`;
                twiml = `
                    <Response>
                        <Play>${recordingUrl}</Play>
                        ${
                            voiceType === "both"
                                ? `<Say voice="alice" language="${language}">${message}</Say>`
                                : ""
                        }
                    </Response>
                `;
            } else {
                // Text to speech
                twiml = `
                    <Response>
                        <Say voice="alice" language="${language}">${message}</Say>
                    </Response>
                `;
            }

            const result = await this.twilioClient.calls.create({
                twiml: twiml,
                from: process.env.TWILIO_PHONE_NUMBER,
                to: to,
                statusCallback: `${process.env.BASE_URL}/notifications/twilio/voice-status`,
            });

            logger.info(`Voice call initiated successfully to ${to}`, {
                sid: result.sid,
            });
            return { success: true, sid: result.sid };
        } catch (error: any) {
            logger.error("Error sending voice notification:", error);
return { success: false, error: error.message };
        }
    }

    public async sendPushNotification(
        userId: string,
        title: string,
        body: string,
        language: string = "en"
    ): Promise<CommunicationResult> {
{
            // Implement your push notification service here (Firebase, OneSignal, etc.)
            // This is a placeholder implementation
            logger.info(
                `Push notification sent to ${userId}: ${title} - ${body}`
            );

            // Example Firebase Cloud Messaging implementation:
            // const message = {
            //     notification: {
            //         title,
            //         body,
            //     },
            //     token: userDeviceToken, // You'd need to store and retrieve this
            // };
            // const response = await admin.messaging().send(message);

            return { success: true };
        } catch (error: any) {
            logger.error("Error sending push notification:", error);
            return { success: false, error: error.message };
        }
    }

    private generateEmailTemplate(subject: string, text: string): string {
        return `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="utf-8">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">
                <title>${subject}</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background: #007bff; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background: #f9f9f9; }
                    .footer { text-align: center; padding: 10px; font-size: 12px; color: #666; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h1>Healthcare Notification</h1>
                    </div>
                    <div class="content">
                        <h2>${subject}</h2>
                        <p>${text}</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message. Please do not reply.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
    }

    public async verifyEmailConfiguration(): Promise<boolean> {
        try {
            await this.emailTransporter.verify();
            logger.info("Email configuration verified successfully");
            return true;
        } catch (error) {
            logger.error("Email configuration verification failed:", error);
            return false;
        }
    }

    public async verifyTwilioConfiguration(): Promise<boolean> {
        try {
            await this.twilioClient.api
                .accounts(process.env.TWILIO_ACCOUNT_SID)
                .fetch();
            logger.info("Twilio configuration verified successfully");
            return true;
        } catch (error) {
            logger.error("Twilio configuration verification failed:", error);
            return false;
        }
    }
}

export const communicationService = new CommunicationService();
