namespace Mona_Interior.Dtos
{
    public class EmployeeDto
    {
        public string? Id { get; set; }
        public string Name { get; set; } = string.Empty;
        public string Role { get; set; } = string.Empty;
        public string Department { get; set; } = string.Empty;
        public string Phone { get; set; } = string.Empty;
        public string Email { get; set; } = string.Empty;
        public decimal Salary { get; set; }
        public string JoinDate { get; set; } = string.Empty;
        public string Status { get; set; } = "Active";
    }
}
