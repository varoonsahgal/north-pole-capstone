#!/usr/bin/env bash
# Launches Santa's Workshop (browser VS Code on EC2) for ONE team.
# Usage (from AWS CloudShell):
#   curl -fsSL https://varoonsahgal.github.io/north-pole-capstone/workshop/launch.sh | bash -s -- dasher
set -euo pipefail

TEAM="${1:-}"
BASE_URL="${WORKSHOP_BASE_URL:-https://varoonsahgal.github.io/north-pole-capstone/workshop}"
REGION="${AWS_REGION:-${AWS_DEFAULT_REGION:-us-west-2}}"

if [[ ! "$TEAM" =~ ^[a-z][a-z0-9]{2,11}$ ]]; then
  echo "Usage: launch.sh <team-name>   (3-12 lowercase letters/digits, e.g. dasher)" >&2
  exit 1
fi
if [[ "$REGION" != "us-west-2" ]]; then
  echo "You are in region $REGION. This class uses us-west-2 (Oregon)." >&2
  echo "Switch the console region to us-west-2, reopen CloudShell and run this again." >&2
  exit 1
fi

STACK="${TEAM}-workshop"
if aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" >/dev/null 2>&1; then
  echo "A workshop for team '$TEAM' already exists. Here are its details:"
else
  echo "Building Santa's Workshop for team '$TEAM' in $REGION."
  echo "This takes about 6-8 minutes. Keep this tab open."
  TEMPLATE="$(mktemp)"
  curl -fsSL "$BASE_URL/workshop.yaml" -o "$TEMPLATE"
  PREFIX_LIST="$(aws ec2 describe-managed-prefix-lists --region "$REGION" \
    --filters Name=prefix-list-name,Values=com.amazonaws.global.cloudfront.origin-facing \
    --query 'PrefixLists[0].PrefixListId' --output text)"
  aws cloudformation deploy --region "$REGION" \
    --stack-name "$STACK" \
    --template-file "$TEMPLATE" \
    --capabilities CAPABILITY_NAMED_IAM \
    --parameter-overrides TeamName="$TEAM" CloudFrontPrefixListId="$PREFIX_LIST" \
    --tags Team="$TEAM" Purpose=capstone
fi

URL="$(aws cloudformation describe-stacks --stack-name "$STACK" --region "$REGION" \
  --query "Stacks[0].Outputs[?OutputKey=='WorkshopUrl'].OutputValue" --output text)"
PASSWORD="$(aws secretsmanager get-secret-value --secret-id "${TEAM}-workshop-password" --region "$REGION" \
  --query SecretString --output text)"

cat <<DONE

  ============================================================
   Santa's Workshop is ready for team: $TEAM
  ============================================================
   URL:       $URL
   Password:  $PASSWORD

   Share BOTH with your teammates (and nobody else).
  ============================================================
DONE
