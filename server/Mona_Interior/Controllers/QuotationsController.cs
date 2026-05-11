using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;
using System.Text.Json;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/quotations")]
    public class QuotationsController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public QuotationsController(MonainteriorDbContext db) => _db = db;

        // GET /api/quotations
        [HttpGet]
        public async Task<IActionResult> GetAll()
        {
            var quotations = await _db.Quotations.ToListAsync();
            var result = quotations.Select(q => new
            {
                id = q.Id.ToString(),
                clientName = q.ClientName,
                clientAddress = q.ClientAddress,
                projectTitle = q.ProjectTitle,
                workDescription = q.WorkDescription,
                date = q.Date,
                billType = q.BillType,
                items = JsonSerializer.Deserialize<JsonElement>(q.Items ?? "[]"),
                total = q.Total
            });
            return Ok(result);
        }

        // POST /api/quotations
        [HttpPost]
        public async Task<IActionResult> Create([FromBody] QuotationDto dto)
        {
            var q = new Quotation
            {
                ClientName = dto.ClientName,
                ClientAddress = dto.ClientAddress,
                ProjectTitle = dto.ProjectTitle,
                WorkDescription = dto.WorkDescription,
                Date = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date,
                BillType = dto.BillType,
                Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : "[]",
                Total = dto.Total
            };
            _db.Quotations.Add(q);
            await _db.SaveChangesAsync();
            return Ok(new { id = q.Id.ToString(), message = "Quotation saved" });
        }

        // PUT /api/quotations/{id}
        [HttpPut("{id}")]
        public async Task<IActionResult> Update(int id, [FromBody] QuotationDto dto)
        {
            var q = await _db.Quotations.FindAsync(id);
            if (q == null) return NotFound();

            q.ClientName = dto.ClientName;
            q.ClientAddress = dto.ClientAddress;
            q.ProjectTitle = dto.ProjectTitle;
            q.WorkDescription = dto.WorkDescription;
            q.Date = dto.Date;
            q.BillType = dto.BillType;
            q.Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : q.Items;
            q.Total = dto.Total;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Quotation updated" });
        }

        // DELETE /api/quotations/{id}
        [HttpDelete("{id}")]
        public async Task<IActionResult> Delete(int id)
        {
            var q = await _db.Quotations.FindAsync(id);
            if (q == null) return NotFound();
            _db.Quotations.Remove(q);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Quotation deleted" });
        }
    }
}
