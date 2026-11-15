# A private Docker image repository for our app
resource "aws_ecr_repository" "app" {
  name         = "${var.team}-sleigh-list"
  force_delete = true # lets "terraform destroy" remove the repo even if it still holds images
}

output "ecr_repository_url" {
  value = aws_ecr_repository.app.repository_url
}
