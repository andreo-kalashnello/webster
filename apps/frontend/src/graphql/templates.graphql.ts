import { gql } from "@apollo/client";

export const BASE_TEMPLATES_QUERY = gql`
  query BaseTemplates {
    baseTemplates {
      id
      title
      thumbnailUrl
      width
      height
      isPublic
      updatedAt
    }
  }
`;

export const USER_TEMPLATES_QUERY = gql`
  query UserTemplates {
    userTemplates {
      id
      title
      thumbnailUrl
      width
      height
      isPublic
      updatedAt
    }
  }
`;

export const CREATE_PROJECT_FROM_TEMPLATE_MUTATION = gql`
  mutation CreateProjectFromTemplate($templateId: ID!, $title: String) {
    createProjectFromTemplate(templateId: $templateId, title: $title) {
      id
      title
      updatedAt
    }
  }
`;

export const CREATE_USER_TEMPLATE_MUTATION = gql`
  mutation CreateUserTemplate($input: CreateUserTemplateDto!) {
    createUserTemplate(input: $input) {
      id
      title
      updatedAt
    }
  }
`;
