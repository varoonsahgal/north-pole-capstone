# ---- Firewall for the load balancer: the whole internet may knock on port 80 ----
resource "aws_security_group" "alb" {
  name        = "${var.team}-alb-sg"
  description = "Allow HTTP from the internet to the load balancer"
  vpc_id      = data.aws_vpc.default.id

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }
}

# ---- The load balancer itself ----
resource "aws_lb" "app" {
  name               = "${var.team}-alb"
  load_balancer_type = "application"
  subnets            = data.aws_subnets.default.ids
  security_groups    = [aws_security_group.alb.id]
}

output "app_url" {
  value = "http://${aws_lb.app.dns_name}"
}
