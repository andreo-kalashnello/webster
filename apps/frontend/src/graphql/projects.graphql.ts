import { gql } from "@apollo/client";

export const PROJECTS_QUERY = gql`
  query Projects($pagination: ProjectsPaginationDto) {
    projects(pagination: $pagination) {
      items {
        id
        title
        width
        height
        thumbnailUrl
        updatedAt
      }
      total
      page
      totalPages
    }
  }
`;

export const CREATE_PROJECT_MUTATION = gql`
  mutation CreateProject($input: CreateProjectDto!) {
    createProject(input: $input) {
      id
      title
      updatedAt
    }
  }
`;
