using Microsoft.EntityFrameworkCore;
using LibraryManagementAPI.Models;

namespace LibraryManagementAPI.Data
{
    public class ApplicationDbContext : DbContext
    {
        public ApplicationDbContext(DbContextOptions<ApplicationDbContext> options) : base(options) { }

        public DbSet<Book> Books { get; set; }
        public DbSet<User> Users { get; set; }

        protected override void OnModelCreating(ModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);
            
            // Seed the single Admin account
            modelBuilder.Entity<User>().HasData(new User
            {
                Id = 1,
                FirstName = "Admin",
                LastName = "Rayees",
                Email = "mohammadrayees360@gmail.com",
                Username = "Admin",
                PasswordHash = BCrypt.Net.BCrypt.HashPassword("rayeesking"),
                Role = "Admin",
                IsApproved = true,
                FavouriteNumber = 360,
                PermissionStatus = "Granted"
            });
        }
    }
}
