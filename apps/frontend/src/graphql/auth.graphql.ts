import { gql } from '@apollo/client';

export const REGISTER_MUTATION = gql`
  mutation Register($input: RegisterDto!) {
    register(input: $input) {
      message
    }
  }
`;

export const LOGIN_MUTATION = gql`
  mutation Login($input: LoginDto!) {
    login(input: $input) {
      message
    }
  }
`;

export const REFRESH_TOKEN_MUTATION = gql`
  mutation RefreshToken {
    refreshToken {
      message
    }
  }
`;

export const GET_CURRENT_USER = gql`
  query GetCurrentUser {
    me {
      id
      email
      firstName
      lastName
      isEmailVerified
      isTwoFactorEnabled
    }
  }
`;

export const VERIFY_EMAIL_MUTATION = gql`
  mutation VerifyEmail($token: String!) {
    verifyEmail(token: $token) {
      message
    }
  }
`;

export const REQUEST_PASSWORD_RESET_MUTATION = gql`
  mutation RequestPasswordReset($input: RequestPasswordResetDto!) {
    requestPasswordReset(input: $input) {
      message
    }
  }
`;

export const RESET_PASSWORD_MUTATION = gql`
  mutation ResetPassword($input: ResetPasswordDto!) {
    resetPassword(input: $input) {
      message
    }
  }
`;

export const REQUEST_MAGIC_LINK_MUTATION = gql`
  mutation RequestMagicLink($input: RequestMagicLinkDto!) {
    requestMagicLink(input: $input) {
      message
    }
  }
`;

export const VERIFY_MAGIC_LINK_MUTATION = gql`
  mutation VerifyMagicLink($token: String!) {
    verifyMagicLink(token: $token) {
      message
    }
  }
`;

export const OAUTH_LOGIN_MUTATION = gql`
  mutation OAuthLogin($input: OAuthLoginDto!) {
    oauthLogin(input: $input) {
      message
    }
  }
`;

export const LOGOUT_MUTATION = gql`
  mutation Logout {
    logout {
      message
    }
  }
`;

export const CHANGE_PASSWORD_MUTATION = gql`
  mutation ChangePassword($input: ChangePasswordDto!) {
    changePassword(input: $input) {
      message
    }
  }
`;

export const UPDATE_PROFILE_MUTATION = gql`
  mutation UpdateProfile($input: UpdateProfileDto!) {
    updateProfile(input: $input) {
      id
      firstName
      lastName
      email
    }
  }
`;