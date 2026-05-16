import { gql } from "@apollo/client";

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
      width
      height
      updatedAt
    }
  }
`;

export const UPDATE_USER_TEMPLATE_MUTATION = gql`
  mutation UpdateUserTemplate($id: ID!, $input: UpdateUserTemplateDto!) {
    updateUserTemplate(id: $id, input: $input) {
      id
      title
      width
      height
      updatedAt
    }
  }
`;

export const DELETE_USER_TEMPLATE_MUTATION = gql`
  mutation DeleteUserTemplate($id: ID!) {
    deleteUserTemplate(id: $id)
  }
`;
