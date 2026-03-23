using LibraryManagementAPI.Data;
using LibraryManagementAPI.DTOs;
using LibraryManagementAPI.Models;
using LibraryManagementAPI.Services;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Cryptography;

namespace LibraryManagementAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class AuthController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly JwtService _jwtService;
        private readonly ILogger<AuthController> _logger;
        private readonly EmailService _emailService;
        private readonly IConfiguration _config;

        public AuthController(ApplicationDbContext context, JwtService jwtService, ILogger<AuthController> logger, EmailService emailService, IConfiguration config)
        {
            _context = context;
            _jwtService = jwtService;
            _logger = logger;
            _emailService = emailService;
            _config = config;
        }

        [HttpPost("register")]
        public async Task<IActionResult> Register([FromBody] RegisterDto request)
        {
            if (await _context.Users.AnyAsync(u => u.Email.ToLower() == request.Email.ToLower() || u.Username.ToLower() == request.Email.ToLower()))
                return BadRequest("Email already exists.");

            var user = new User
            {
                FirstName = request.FirstName,
                LastName = request.LastName,
                Email = request.Email,
                Username = request.Email, // Username is mapped to Email
                PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.Password), 
                Role = "User", // Hardcoded to User
                IsApproved = false,
                PermissionStatus = "None"
            };

            _context.Users.Add(user);
            await _context.SaveChangesAsync();

            return Ok("Account registered successfully. Pending Admin approval.");
        }

        [HttpPost("login")]
        public async Task<IActionResult> Login([FromBody] LoginDto request)
        {
            var user = await _context.Users.FirstOrDefaultAsync(u => u.Username.ToLower() == request.Username.ToLower());

            if (user == null)
                return NotFound("Account does not exist.");

            if (!BCrypt.Net.BCrypt.Verify(request.Password, user.PasswordHash))
                return Unauthorized("Incorrect password.");

            if (user.Role == "User" && !user.IsApproved)
            {
                 _logger.LogInformation($"[EMAIL LOG] Sending Email to Admin: User '{user.Username}' attempted to log in but needs approval.");
                 await _emailService.SendApprovalEmailAsync(user);
                 return Unauthorized("Your account is pending Admin approval. A notification has been sent to the admin email.");
            }

            var token = _jwtService.GenerateToken(user);
            var welcomeMessage = user.Role == "Admin" ? "Welcome, Admin." : $"Welcome, {user.Username}.";

            var message = user.Role == "Admin" ? "Admin login successful." : "User login successful.";
            
            if (user.Role == "User")
            {
                await _emailService.SendLoginNotificationAsync(user.Email);
            }

            return Ok(new 
            { 
                Message = message, 
                WelcomeMessage = welcomeMessage,
                Token = token,
                PermissionStatus = user.PermissionStatus // Send to frontend
            });
        }

        [HttpGet("users")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingUsers()
        {
            var users = await _context.Users.Where(u => u.Role == "User").Select(u => new { u.Id, u.Username, u.IsApproved }).ToListAsync();
            return Ok(users);
        }

        [HttpPut("approve/{id}")]
        [Microsoft.AspNetCore.Authorization.Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApproveUser(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            user.IsApproved = true;
            await _context.SaveChangesAsync();
            return Ok("User approved successfully.");
        }

        [HttpGet("approve-email/{id}")]
        public async Task<IActionResult> ApproveUserViaEmail(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return Content("<html><body><h2>User not found!</h2></body></html>", "text/html");

            if (user.IsApproved) return Content("<html><body><h2>User is already approved!</h2></body></html>", "text/html");

            user.IsApproved = true;
            await _context.SaveChangesAsync();
            return Content($"<html><body style='font-family:sans-serif; text-align:center; padding-top:50px; background:#f0f9ff; color:#0f172a;'><h2>User '{user.Username}' has been successfully approved! ✅</h2><p style='color:#334155; font-size:1.1rem'>They can now log into the application. You can safely close this window.</p></body></html>", "text/html");
        }

        [HttpPost("forgot-password-admin")]
        public async Task<IActionResult> AdminForgotPassword([FromBody] AdminForgotPasswordDto request)
        {
            var admin = await _context.Users.SingleOrDefaultAsync(u => u.Role == "Admin");
            if (admin == null || admin.FavouriteNumber != request.FavouriteNumber)
                return BadRequest("Invalid details provided.");

            admin.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            await _context.SaveChangesAsync();

            return Ok("Admin password reset successfully.");
        }

        [HttpPost("check-email")]
        public async Task<IActionResult> CheckEmail([FromBody] CheckEmailDto request)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.Role == "User");
            if (user == null)
            {
                return BadRequest("This email does not exist in the database.");
            }
            return Ok("Email verified successfully.");
        }

        [HttpPost("forgot-password-user")]
        public async Task<IActionResult> UserForgotPassword([FromBody] UserForgotPasswordDto request)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == request.Email.ToLower() && u.Role == "User");
            if (user == null)
            {
                // To prevent email enumeration, still return Ok but don't do anything
                return Ok("If an account with this email exists, a password reset link has been sent.");
            }

            // Generate a secure payload token
            var rawToken = Convert.ToBase64String(RandomNumberGenerator.GetBytes(32));
            var tokenHash = BCrypt.Net.BCrypt.HashPassword(rawToken);

            user.ResetToken = tokenHash;
            user.ResetTokenExpiry = DateTime.UtcNow.AddMinutes(15);
            
            await _context.SaveChangesAsync();

            // The frontend is assumed to run on Live Server on port 5500 for local dev
            var resetLink = $"http://127.0.0.1:5500/frontend/reset-password.html?token={Uri.EscapeDataString(rawToken)}&email={Uri.EscapeDataString(user.Email)}";
            
            await _emailService.SendPasswordResetEmailAsync(user.Email, resetLink);

            return Ok("If an account with this email exists, a password reset link has been sent.");
        }

        [HttpGet("verify-reset-token")]
        public async Task<IActionResult> VerifyResetToken([FromQuery] string token, [FromQuery] string email)
        {
            var user = await _context.Users.SingleOrDefaultAsync(u => u.Email.ToLower() == email.ToLower() && u.Role == "User");
            if (user == null || user.ResetToken == null || user.ResetTokenExpiry == null)
                return BadRequest("Invalid or expired reset link.");

            if (user.ResetTokenExpiry < DateTime.UtcNow)
                return BadRequest("This reset link has expired. Please request a new one.");

            if (!BCrypt.Net.BCrypt.Verify(token, user.ResetToken))
                return BadRequest("Invalid or expired reset link.");

            return Ok("Token is valid.");
        }

        [HttpPost("reset-password")]
        public async Task<IActionResult> ResetPassword([FromBody] ResetPasswordDto request)
        {
            if (request.NewPassword != request.ConfirmPassword)
                return BadRequest("Passwords do not match.");

            // Find all users with active reset tokens and check which one matches
            var usersWithTokens = await _context.Users
                .Where(u => u.ResetToken != null && u.ResetTokenExpiry != null && u.ResetTokenExpiry > DateTime.UtcNow)
                .ToListAsync();

            User? matchedUser = null;
            foreach (var u in usersWithTokens)
            {
                if (BCrypt.Net.BCrypt.Verify(request.Token, u.ResetToken!))
                {
                    matchedUser = u;
                    break;
                }
            }

            if (matchedUser == null)
                return BadRequest("Invalid or expired reset link.");

            // Update the password
            matchedUser.PasswordHash = BCrypt.Net.BCrypt.HashPassword(request.NewPassword);
            
            // Invalidate the token (single-use)
            matchedUser.ResetToken = null;
            matchedUser.ResetTokenExpiry = null;
            
            await _context.SaveChangesAsync();

            return Ok("Password changed successfully. You can now log in with your new password.");
        }
    }
}
