terraform {
  required_version = ">= 1.6"

  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 6.0"
    }
  }
}

# No access keys here! Terraform borrows the workshop's IAM role automatically.
provider "aws" {
  region = "us-west-2"

  default_tags {
    tags = {
      Team    = var.team
      Project = "capstone-1"
    }
  }
}

variable "team" {
  description = "Your team name. It is put in front of every resource name so teams never collide."
  type        = string
}
