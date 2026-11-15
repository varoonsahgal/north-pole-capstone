#!/usr/bin/env bash
# Lists AWS resources in us-west-2 whose names start with a team name.
# Usage:  curl -fsSL https://varoonsahgal.github.io/north-pole-capstone/workshop/leftovers.sh | bash -s -- dasher
# It only LOOKS. It never deletes anything.
set -uo pipefail
TEAM="${1:-${TEAM:-}}"
if [[ ! "$TEAM" =~ ^[a-z][a-z0-9]{2,11}$ ]]; then
  echo "Usage: leftovers.sh <team-name>" >&2
  exit 1
fi
export AWS_DEFAULT_REGION=us-west-2 AWS_PAGER=""
FOUND=0
show() { # show "Label" "items (whitespace separated)"
  local label="$1" items="$2"
  if [[ -n "${items//[[:space:]]/}" && "$items" != "None" ]]; then
    FOUND=1
    printf '\n%s\n' "$label"
    for item in $items; do printf '   - %s\n' "$item"; done
  fi
}
q() { "$@" 2>/dev/null || true; }

echo "Looking for anything named '$TEAM-*' in us-west-2 ..."
show "ECS clusters"            "$(q aws ecs list-clusters --query "clusterArns[?contains(@, '/$TEAM-')]" --output text)"
show "ECR repositories"        "$(q aws ecr describe-repositories --query "repositories[?starts_with(repositoryName, '$TEAM-')].repositoryName" --output text)"
show "Load balancers"          "$(q aws elbv2 describe-load-balancers --query "LoadBalancers[?starts_with(LoadBalancerName, '$TEAM-')].LoadBalancerName" --output text)"
show "Target groups"           "$(q aws elbv2 describe-target-groups --query "TargetGroups[?starts_with(TargetGroupName, '$TEAM-')].TargetGroupName" --output text)"
show "Security groups"         "$(q aws ec2 describe-security-groups --query "SecurityGroups[?starts_with(GroupName, '$TEAM-')].GroupName" --output text)"
show "Lambda functions"        "$(q aws lambda list-functions --query "Functions[?starts_with(FunctionName, '$TEAM-')].FunctionName" --output text)"
show "API Gateway REST APIs"   "$(q aws apigateway get-rest-apis --query "items[?starts_with(name, '$TEAM-')].name" --output text)"
show "CodePipeline pipelines"  "$(q aws codepipeline list-pipelines --query "pipelines[?starts_with(name, '$TEAM-')].name" --output text)"
show "CodeBuild projects"      "$(q aws codebuild list-projects --query "projects[?starts_with(@, '$TEAM-')]" --output text)"
show "GitHub connections"      "$(q aws codeconnections list-connections --query "Connections[?starts_with(ConnectionName, '$TEAM-')].ConnectionName" --output text)"
show "EKS clusters"            "$(q aws eks list-clusters --query "clusters[?starts_with(@, '$TEAM-')]" --output text)"
show "S3 buckets"              "$(q aws s3api list-buckets --query "Buckets[?starts_with(Name, '$TEAM-')].Name" --output text)"
show "CloudWatch log groups"   "$(q aws logs describe-log-groups --query "logGroups[?contains(logGroupName, '/$TEAM-')].logGroupName" --output text)"
show "IAM roles"               "$(q aws iam list-roles --query "Roles[?starts_with(RoleName, '$TEAM-')].RoleName" --output text)"
show "CloudFormation stacks"   "$(q aws cloudformation list-stacks --stack-status-filter CREATE_COMPLETE UPDATE_COMPLETE ROLLBACK_COMPLETE CREATE_FAILED DELETE_FAILED UPDATE_ROLLBACK_COMPLETE --query "StackSummaries[?contains(StackName, '$TEAM-')].StackName" --output text)"

if [[ $FOUND -eq 0 ]]; then
  echo
  echo "Nothing found. The North Pole is spotless."
else
  echo
  echo "The list above is what still exists for team '$TEAM'."
  echo "(Your '$TEAM-workshop' stack and its role are expected until the very end.)"
fi
