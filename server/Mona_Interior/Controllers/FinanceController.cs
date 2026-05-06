using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Mona_Interior.Dtos;
using Mona_Interior.models;
using System.Text.Json;

namespace Mona_Interior.Controllers
{
    [ApiController]
    [Route("api/finance")]
    public class FinanceController : ControllerBase
    {
        private readonly MonainteriorDbContext _db;
        public FinanceController(MonainteriorDbContext db) => _db = db;

        // ── INVOICES ─────────────────────────────────────────────────

        // GET /api/finance/invoices
        [HttpGet("invoices")]
        public async Task<IActionResult> GetInvoices()
        {
            var invoices = await _db.Invoices.OrderByDescending(i => i.Date).ToListAsync();
            var result = invoices.Select(i => new
            {
                id = i.Id.ToString(),
                invoiceNo = i.InvoiceNo,
                invoiceDate = i.InvoiceDate,
                clientName = i.ClientName,
                clientAddress = i.ClientAddress,
                items = JsonSerializer.Deserialize<JsonElement>(i.Items ?? "{}"),
                total = i.Total,
                billType = i.BillType,
                status = i.Status,
                date = i.Date
            });
            return Ok(result);
        }

        // POST /api/finance/invoices
        [HttpPost("invoices")]
        public async Task<IActionResult> CreateInvoice([FromBody] InvoiceDto dto)
        {
            var inv = new Invoice
            {
                InvoiceNo = dto.InvoiceNo,
                InvoiceDate = dto.InvoiceDate,
                ClientName = dto.ClientName,
                ClientAddress = dto.ClientAddress,
                Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : "{}",
                Total = dto.Total,
                BillType = dto.BillType,
                Status = dto.Status,
                Date = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date
            };
            _db.Invoices.Add(inv);
            await _db.SaveChangesAsync();
            return Ok(new { id = inv.Id.ToString(), message = "Invoice saved" });
        }

        // PUT /api/finance/invoices/{id}
        [HttpPut("invoices/{id}")]
        public async Task<IActionResult> UpdateInvoice(int id, [FromBody] InvoiceDto dto)
        {
            var inv = await _db.Invoices.FindAsync(id);
            if (inv == null) return NotFound();

            inv.InvoiceNo = dto.InvoiceNo;
            inv.InvoiceDate = dto.InvoiceDate;
            inv.ClientName = dto.ClientName;
            inv.ClientAddress = dto.ClientAddress;
            inv.Items = dto.Items.HasValue ? dto.Items.Value.GetRawText() : inv.Items;
            inv.Total = dto.Total;
            inv.BillType = dto.BillType;
            inv.Status = dto.Status;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Invoice updated" });
        }

        // PATCH /api/finance/invoices/{id}/status — update payment status only
        [HttpPatch("invoices/{id}/status")]
        public async Task<IActionResult> UpdateInvoiceStatus(int id, [FromBody] JsonElement body)
        {
            var inv = await _db.Invoices.FindAsync(id);
            if (inv == null) return NotFound();

            if (body.TryGetProperty("status", out var status))
                inv.Status = status.GetString() ?? inv.Status;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Status updated" });
        }

        // DELETE /api/finance/invoices/{id}
        [HttpDelete("invoices/{id}")]
        public async Task<IActionResult> DeleteInvoice(int id)
        {
            var inv = await _db.Invoices.FindAsync(id);
            if (inv == null) return NotFound();
            _db.Invoices.Remove(inv);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Invoice deleted" });
        }

        // ── EXPENSES ─────────────────────────────────────────────────

        // GET /api/finance/expenses
        [HttpGet("expenses")]
        public async Task<IActionResult> GetExpenses()
        {
            var expenses = await _db.Expenses.OrderByDescending(e => e.Date).ToListAsync();
            var result = expenses.Select(e => new
            {
                id = e.Id.ToString(),
                date = e.Date,
                category = e.Category,
                description = e.Description,
                amount = e.Amount,
                clientId = e.ClientId,
                type = e.Type
            });
            return Ok(result);
        }

        // POST /api/finance/expenses
        [HttpPost("expenses")]
        public async Task<IActionResult> CreateExpense([FromBody] ExpenseDto dto)
        {
            var exp = new Expense
            {
                Date = string.IsNullOrEmpty(dto.Date) ? DateTime.Now.ToString("yyyy-MM-dd") : dto.Date,
                Category = dto.Category,
                Description = dto.Description,
                Amount = dto.Amount,
                ClientId = dto.ClientId,
                Type = dto.Type
            };
            _db.Expenses.Add(exp);
            await _db.SaveChangesAsync();
            return Ok(new { id = exp.Id.ToString(), message = "Expense recorded" });
        }

        // PUT /api/finance/expenses/{id}
        [HttpPut("expenses/{id}")]
        public async Task<IActionResult> UpdateExpense(int id, [FromBody] ExpenseDto dto)
        {
            var exp = await _db.Expenses.FindAsync(id);
            if (exp == null) return NotFound();

            exp.Date = dto.Date;
            exp.Category = dto.Category;
            exp.Description = dto.Description;
            exp.Amount = dto.Amount;
            exp.ClientId = dto.ClientId;
            exp.Type = dto.Type;

            await _db.SaveChangesAsync();
            return Ok(new { message = "Expense updated" });
        }

        // DELETE /api/finance/expenses/{id}
        [HttpDelete("expenses/{id}")]
        public async Task<IActionResult> DeleteExpense(int id)
        {
            var exp = await _db.Expenses.FindAsync(id);
            if (exp == null) return NotFound();
            _db.Expenses.Remove(exp);
            await _db.SaveChangesAsync();
            return Ok(new { message = "Expense deleted" });
        }

        // ── PAYROLL ──────────────────────────────────────────────────

        // GET /api/finance/payroll
        [HttpGet("payroll")]
        public async Task<IActionResult> GetPayroll()
        {
            var records = await _db.PayrollRecords.OrderByDescending(p => p.Year).ThenBy(p => p.Month).ToListAsync();
            var result = records.Select(p => new
            {
                id = p.Id.ToString(),
                employeeId = p.EmployeeId,
                month = p.Month,
                year = p.Year,
                baseSalary = p.BaseSalary,
                deductions = p.Deductions,
                netPay = p.NetPay,
                paidDate = p.PaidDate,
                status = p.Status,
                attendanceBreakdown = string.IsNullOrEmpty(p.AttendanceBreakdown)
                    ? (object)"{}"
                    : JsonSerializer.Deserialize<JsonElement>(p.AttendanceBreakdown)
            });
            return Ok(result);
        }

        // POST /api/finance/payroll
        [HttpPost("payroll")]
        public async Task<IActionResult> CreatePayroll([FromBody] PayrollDto dto)
        {
            var record = new PayrollRecord
            {
                EmployeeId = dto.EmployeeId,
                Month = dto.Month,
                Year = dto.Year,
                BaseSalary = dto.BaseSalary,
                Deductions = dto.Deductions,
                NetPay = dto.NetPay,
                PaidDate = dto.PaidDate,
                Status = dto.Status,
                AttendanceBreakdown = dto.AttendanceBreakdown.HasValue
                    ? dto.AttendanceBreakdown.Value.GetRawText()
                    : "{}"
            };
            _db.PayrollRecords.Add(record);
            await _db.SaveChangesAsync();
            return Ok(new { id = record.Id.ToString(), message = "Payroll entry saved" });
        }

        // ── ACCOUNTS (Computed Ledger) ────────────────────────────────

        // GET /api/finance/accounts
        [HttpGet("accounts")]
        public async Task<IActionResult> GetAccounts()
        {
            var invoices = await _db.Invoices.ToListAsync();
            var expenses = await _db.Expenses.ToListAsync();
            var payroll = await _db.PayrollRecords.ToListAsync();

            var ledgerEntries = invoices.Select(i => new
            {
                id = "inv-" + i.Id,
                date = i.Date,
                type = "Credit",
                category = "Project Income",
                description = $"Invoice #{i.InvoiceNo} — {i.ClientName}",
                amount = i.Total
            }).AsEnumerable().Concat(expenses.Select(e => new
            {
                id = "exp-" + e.Id,
                date = e.Date,
                type = "Debit",
                category = e.Category,
                description = e.Description,
                amount = e.Amount
            })).Concat(payroll.Select(p => new
            {
                id = "pay-" + p.Id,
                date = p.PaidDate,
                type = "Debit",
                category = "Employee Payroll",
                description = $"Payroll — Employee ID {p.EmployeeId} ({p.Month} {p.Year})",
                amount = p.NetPay
            })).OrderByDescending(e => e.date).ToList();

            return Ok(ledgerEntries);
        }
    }
}
