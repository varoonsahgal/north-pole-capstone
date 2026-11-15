# ---- Target group: the list of containers the load balancer may send traffic to ----
resource "aws_lb_target_group" "app" {
  name                 = "${var.team}-tg"
  port                 = 3000 # our container listens on 3000
  protocol             = "HTTP"
  target_type          = "ip" # Fargate tasks are registered by IP address
  vpc_id               = data.aws_vpc.default.id
  deregistration_delay = 15

  # The load balancer asks every container "are you alive?" every 15 seconds
  health_check {
    path              = "/health"
    matcher           = "200"
    interval          = 15
    healthy_threshold = 2
  }
}

# ---- Listener: "when someone knocks on port 80, forward them to the target group" ----
resource "aws_lb_listener" "http" {
  load_balancer_arn = aws_lb.app.arn
  port              = 80
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }
}
