using System.Text.Json;

namespace Mona_Interior.Dtos
{
    public class QuotationDto
    {
        public string? Id { get; set; }
        public string ClientName { get; set; } = string.Empty;
        public string ClientAddress { get; set; } = string.Empty;
        public string Date { get; set; } = string.Empty;
        public string BillType { get; set; } = "GST";
        // Items come as raw JSON from frontend
        public JsonElement? Items { get; set; }
        public decimal Total { get; set; }
    }
}
