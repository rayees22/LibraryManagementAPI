namespace LibraryManagementAPI.DTOs
{
    public class LoginDto
    {
        public required string Username { get; set; }
        public required string Password { get; set; }
        public string Role { get; set; } = "User"; // Can be specified during registration
    }
}
