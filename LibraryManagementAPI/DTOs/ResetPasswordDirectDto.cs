namespace LibraryManagementAPI.DTOs
{
    public class ResetPasswordDirectDto
    {
        public string Email { get; set; } = string.Empty;
        public string NewPassword { get; set; } = string.Empty;
    }
}
