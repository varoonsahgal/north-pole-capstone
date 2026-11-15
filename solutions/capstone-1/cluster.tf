# An ECS cluster is just a named group that our containers will run in
resource "aws_ecs_cluster" "main" {
  name = "${var.team}-cluster"
}
