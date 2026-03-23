namespace LibraryManagementAPI.Models
{
    public class User
    {
        public int Id { get; set; }
        public required string FirstName { get; set; }
        public required string LastName { get; set; }
        public required string Email { get; set; }
        public required string Username { get; set; }
        public required string PasswordHash { get; set; }
        public required string Role { get; set; } = "User"; // "Admin" or "User"
        public bool IsApproved { get; set; } = false;
        
        // Password Recovery
        public int? FavouriteNumber { get; set; }
        public string? ResetToken { get; set; }
        public DateTime? ResetTokenExpiry { get; set; }
        
        // Permission System
        public string PermissionStatus { get; set; } = "None"; // "None", "Pending", "Granted", "Rejected"
    }
}
