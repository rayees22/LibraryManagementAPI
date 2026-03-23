namespace LibraryManagementAPI.DTOs
{
    public class CheckEmailDto
    {
        public required string Email { get; set; }
    }

    public class AdminForgotPasswordDto
    {
        public int FavouriteNumber { get; set; }
        public required string NewPassword { get; set; }
    }

    public class UserForgotPasswordDto
    {
        public required string Email { get; set; }
    }

    public class ResetPasswordDto
    {
        public required string Token { get; set; }
        public required string NewPassword { get; set; }
        public required string ConfirmPassword { get; set; }
    }
}
