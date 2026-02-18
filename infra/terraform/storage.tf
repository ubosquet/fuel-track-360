# ════════════════════════════════════════════════════════════
# Cloud Storage — Photo uploads + Signatures
# ════════════════════════════════════════════════════════════

resource "google_storage_bucket" "uploads" {
  name          = "ft360-uploads-${var.environment}-${var.project_id}"
  location      = var.region
  storage_class = "STANDARD"

  uniform_bucket_level_access = true

  versioning {
    enabled = true
  }

  lifecycle_rule {
    condition {
      age = 365
    }
    action {
      type          = "SetStorageClass"
      storage_class = "NEARLINE"
    }
  }

  lifecycle_rule {
    condition {
      age = 730 # 2 years
    }
    action {
      type          = "SetStorageClass"
      storage_class = "COLDLINE"
    }
  }

  cors {
    origin          = ["*"]
    method          = ["GET", "PUT", "POST"]
    response_header = ["Content-Type", "Authorization"]
    max_age_seconds = 3600
  }
}

# ════════════════════════════════════════════════════════════
# Secret Manager — Database password
# ════════════════════════════════════════════════════════════

resource "google_secret_manager_secret" "db_password" {
  secret_id = "ft360-db-password-${var.environment}"

  replication {
    auto {}
  }
}

resource "google_secret_manager_secret_version" "db_password" {
  secret      = google_secret_manager_secret.db_password.id
  secret_data = random_password.db_password.result
}

# ════════════════════════════════════════════════════════════
# Enable APIs
# ════════════════════════════════════════════════════════════

resource "google_project_service" "apis" {
  for_each = toset([
    "run.googleapis.com",
    "sqladmin.googleapis.com",
    "secretmanager.googleapis.com",
    "servicenetworking.googleapis.com",
    "compute.googleapis.com",
    "firebase.googleapis.com",
    "firebaseauth.googleapis.com",
    "storage.googleapis.com",
    "cloudbuild.googleapis.com",
  ])

  service                    = each.value
  disable_dependent_services = false
}
