# ---- Who is allowed to start our containers? ----
# ECS itself needs permission to pull the image from ECR and to write logs.
data "aws_iam_policy_document" "ecs_tasks_assume" {
  statement {
    actions = ["sts:AssumeRole"]

    principals {
      type        = "Service"
      identifiers = ["ecs-tasks.amazonaws.com"]
    }
  }
}

resource "aws_iam_role" "task_execution" {
  name               = "${var.team}-task-execution-role"
  assume_role_policy = data.aws_iam_policy_document.ecs_tasks_assume.json
}

resource "aws_iam_role_policy_attachment" "task_execution" {
  role       = aws_iam_role.task_execution.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# ---- Where do the container's logs go? ----
resource "aws_cloudwatch_log_group" "app" {
  name              = "/ecs/${var.team}-sleigh-list"
  retention_in_days = 7
}

# ---- The task definition: the recipe for running our container ----
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.team}-sleigh-list"
  requires_compatibilities = ["FARGATE"] # serverless containers: no EC2 to manage
  network_mode             = "awsvpc"    # required for Fargate: every task gets its own network card
  cpu                      = 256         # 0.25 vCPU
  memory                   = 512         # MB
  execution_role_arn       = aws_iam_role.task_execution.arn

  container_definitions = jsonencode([
    {
      name      = "sleigh-list"
      image     = "${aws_ecr_repository.app.repository_url}:latest"
      essential = true
      portMappings = [
        { containerPort = 3000, protocol = "tcp" }
      ]
      logConfiguration = {
        logDriver = "awslogs"
        options = {
          "awslogs-group"         = aws_cloudwatch_log_group.app.name
          "awslogs-region"        = "us-west-2"
          "awslogs-stream-prefix" = "elf"
        }
      }
    }
  ])
}
