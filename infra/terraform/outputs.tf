output "api_url" {
  description = "Cloud Run API URL"
  value       = google_cloud_run_v2_service.api.uri
}

output "database_connection" {
  description = "Cloud SQL connection name"
  value       = google_sql_database_instance.ft360.connection_name
  sensitive   = true
}

output "database_private_ip" {
  description = "Cloud SQL private IP"
  value       = google_sql_database_instance.ft360.private_ip_address
  sensitive   = true
}

output "uploads_bucket" {
  description = "Cloud Storage bucket for uploads"
  value       = google_storage_bucket.uploads.name
}

output "service_account_email" {
  description = "API service account email"
  value       = google_service_account.api.email
}
