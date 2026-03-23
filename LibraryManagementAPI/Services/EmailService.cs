using System.Net;
using System.Net.Mail;
using LibraryManagementAPI.Models;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;

namespace LibraryManagementAPI.Services
{
    public class EmailService
    {
        private readonly IConfiguration _config;
        private readonly ILogger<EmailService> _logger;

        public EmailService(IConfiguration config, ILogger<EmailService> logger)
        {
            _config = config;
            _logger = logger;
        }

        public async Task SendApprovalEmailAsync(User user)
        {
            var settings = _config.GetSection("EmailSettings");
            var adminEmail = settings["AdminEmail"] ?? "mohammadrayees360@gmail.com";
            var host = settings["Host"] ?? "smtp.gmail.com";
            var portStr = settings["Port"] ?? "587";
            var port = int.TryParse(portStr, out int p) ? p : 587;
            var username = settings["Username"];
            var password = settings["Password"];

            if (string.IsNullOrEmpty(username) || username == "YOUR_GMAIL@gmail.com")
            {
                _logger.LogWarning($"[EMAIL SIMULATION ONLY] Real credentials not set in appsettings.json. Email would have been sent to {adminEmail} with Approval Link: http://localhost:5207/api/auth/approve-email/{user.Id}");
                return;
            }

            try
            {
                var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(username, "Library Management System"),
                    Subject = "New User Pending Approval",
                    Body = $"Hello Admin,\n\nA new user '{user.Username}' is trying to access the Library Management System but their account is pending approval.\n\nClick the link below to instantly grant them access:\n\nhttp://localhost:5207/api/auth/approve-email/{user.Id}\n\nThanks!",
                    IsBodyHtml = false
                };
                mailMessage.To.Add(adminEmail);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation($"Successfully sent REAL approval email to {adminEmail} for user {user.Username}!");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send email: {ex.Message}");
            }
        }

        public async Task SendPasswordResetEmailAsync(string userEmail, string resetLink)
        {
            var settings = _config.GetSection("EmailSettings");
            var host = settings["Host"] ?? "smtp.gmail.com";
            var portStr = settings["Port"] ?? "587";
            var port = int.TryParse(portStr, out int p) ? p : 587;
            var username = settings["Username"];
            var password = settings["Password"];

            if (string.IsNullOrEmpty(username) || username == "YOUR_GMAIL@gmail.com")
            {
                _logger.LogWarning($"[EMAIL SIMULATION] Password Reset Link for {userEmail}: {resetLink}");
                return;
            }

            try
            {
                var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var htmlBody = $@"
                    <div style='font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;'>
                        <h2 style='color: #6366f1;'>Password Reset Request</h2>
                        <p>Hello,</p>
                        <p>We received a request to reset your password for the Library Management System.</p>
                        <p>Click the button below to reset your password. This link will expire in <strong>15 minutes</strong>.</p>
                        <div style='text-align: center; margin: 30px 0;'>
                            <a href='{resetLink}' style='background-color: #6366f1; color: white; padding: 14px 28px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px;'>Reset Password</a>
                        </div>
                        <p style='color: #666; font-size: 14px;'>If you did not request a password reset, please ignore this email. Your password will remain unchanged.</p>
                        <hr style='border: none; border-top: 1px solid #eee; margin: 20px 0;' />
                        <p style='color: #999; font-size: 12px;'>Library Management System</p>
                    </div>";

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(username, "Library Management System"),
                    Subject = "Password Reset Request",
                    Body = htmlBody,
                    IsBodyHtml = true
                };
                mailMessage.To.Add(userEmail);

                await client.SendMailAsync(mailMessage);
                _logger.LogInformation($"Successfully sent password reset email to {userEmail}");
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send password reset email: {ex.Message}");
            }
        }

        public async Task SendLoginNotificationAsync(string userEmail)
        {
            var settings = _config.GetSection("EmailSettings");
            var adminEmail = settings["AdminEmail"] ?? "mohammadrayees360@gmail.com";
            var host = settings["Host"] ?? "smtp.gmail.com";
            var portStr = settings["Port"] ?? "587";
            var port = int.TryParse(portStr, out int p) ? p : 587;
            var username = settings["Username"];
            var password = settings["Password"];

            if (string.IsNullOrEmpty(username) || username == "YOUR_GMAIL@gmail.com")
            {
                _logger.LogWarning($"[EMAIL SIMULATION] Sent to Admin {adminEmail}: User '{userEmail}' just logged in.");
                return;
            }

            try
            {
                var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(username, "Library Management System"),
                    Subject = "User Login Notification",
                    Body = $"Hello Admin,\n\nThe user with email '{userEmail}' has just logged into the system.\n\nThanks!",
                    IsBodyHtml = false
                };
                mailMessage.To.Add(adminEmail);

                await client.SendMailAsync(mailMessage);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send login notification email: {ex.Message}");
            }
        }
        
        public async Task SendPermissionRequestAsync(User user)
        {
             var settings = _config.GetSection("EmailSettings");
            var adminEmail = settings["AdminEmail"] ?? "mohammadrayees360@gmail.com";
            var host = settings["Host"] ?? "smtp.gmail.com";
            var portStr = settings["Port"] ?? "587";
            var port = int.TryParse(portStr, out int p) ? p : 587;
            var username = settings["Username"];
            var password = settings["Password"];

            if (string.IsNullOrEmpty(username) || username == "YOUR_GMAIL@gmail.com")
            {
                _logger.LogWarning($"[EMAIL SIMULATION] Sent to Admin {adminEmail}: User '{user.Email}' requested edit permissions.");
                return;
            }

            try
            {
                var client = new SmtpClient(host, port)
                {
                    Credentials = new NetworkCredential(username, password),
                    EnableSsl = true
                };

                var mailMessage = new MailMessage
                {
                    From = new MailAddress(username, "Library Management System"),
                    Subject = "Permission Request",
                    Body = $"Hello Admin,\n\nThe user '{user.Email}' has requested permission to Insert, Edit, and Delete library data.\n\nPlease log in to the Admin Panel to Accept or Reject this request.",
                    IsBodyHtml = false
                };
                mailMessage.To.Add(adminEmail);

                await client.SendMailAsync(mailMessage);
            }
            catch (Exception ex)
            {
                _logger.LogError($"Failed to send permission request email: {ex.Message}");
            }
        }
    }
}
