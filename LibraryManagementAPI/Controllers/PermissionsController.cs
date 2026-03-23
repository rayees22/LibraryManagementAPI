using LibraryManagementAPI.Data;
using LibraryManagementAPI.Models;
using LibraryManagementAPI.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Security.Claims;

namespace LibraryManagementAPI.Controllers
{
    [Route("api/[controller]")]
    [ApiController]
    public class PermissionsController : ControllerBase
    {
        private readonly ApplicationDbContext _context;
        private readonly EmailService _emailService;
        private readonly ILogger<PermissionsController> _logger;

        public PermissionsController(ApplicationDbContext context, EmailService emailService, ILogger<PermissionsController> logger)
        {
            _context = context;
            _emailService = emailService;
            _logger = logger;
        }

        [HttpPost("request")]
        [Authorize(Roles = "User")]
        public async Task<IActionResult> RequestPermission()
        {
            // Extract username/email from token claims
            var usernameClaim = User.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;
            if (string.IsNullOrEmpty(usernameClaim)) return Unauthorized();

            var user = await _context.Users.SingleOrDefaultAsync(u => u.Username == usernameClaim);
            if (user == null) return NotFound("User not found.");

            if (user.PermissionStatus == "Granted")
                return BadRequest("You already have edit permissions.");

            user.PermissionStatus = "Pending";
            await _context.SaveChangesAsync();

            _logger.LogInformation($"[EMAIL LOG] Sending Request Permission Email to Admin for user {user.Email}.");
            await _emailService.SendPermissionRequestAsync(user);

            return Ok(new { Message = "Permission request sent to Admin.", PermissionStatus = user.PermissionStatus });
        }

        [HttpGet("pending")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> GetPendingRequests()
        {
            var users = await _context.Users
                .Where(u => u.Role == "User" && u.PermissionStatus == "Pending")
                .Select(u => new { u.Id, u.Username, u.Email, u.PermissionStatus })
                .ToListAsync();

            return Ok(users);
        }

        [HttpPut("approve/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> ApprovePermission(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            user.PermissionStatus = "Granted";
            await _context.SaveChangesAsync();
            return Ok("Permission granted successfully.");
        }

        [HttpPut("reject/{id}")]
        [Authorize(Roles = "Admin")]
        public async Task<IActionResult> RejectPermission(int id)
        {
            var user = await _context.Users.FindAsync(id);
            if (user == null) return NotFound("User not found.");

            user.PermissionStatus = "Rejected";
            await _context.SaveChangesAsync();
            return Ok("Permission rejected.");
        }
    }
}
