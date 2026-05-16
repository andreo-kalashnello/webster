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

export const DELETE_PROJECT_MUTATION = gql`
  mutation DeleteProject($id: ID!) {
    deleteProject(id: $id)
  }
`;

export const PROJECT_QUERY = gql`
  query Project($id: ID!) {
    project(id: $id) {
      id
      title
      width
      height
      content
      updatedAt
    }
  }
`;

export const AUTOSAVE_PROJECT_MUTATION = gql`
  mutation AutosaveProject($id: ID!, $content: JSON!) {
    autosaveProject(id: $id, content: $content) {
      id
      updatedAt
      content
    }
  }
`;

export const UPDATE_PROJECT_MUTATION = gql`
  mutation UpdateProject($id: ID!, $input: UpdateProjectDto!) {
    updateProject(id: $id, input: $input) {
      id
      title
      updatedAt
      content
    }
  }
`;

export const VERSIONS_QUERY = gql`
  query Versions($projectId: ID!) {
    versions(projectId: $projectId) {
      id
      label
      createdAt
    }
  }
`;

export const CREATE_VERSION_MUTATION = gql`
  mutation CreateVersion($projectId: ID!, $label: String) {
    createVersion(projectId: $projectId, label: $label) {
      id
      label
      createdAt
    }
  }
`;

export const RESTORE_VERSION_MUTATION = gql`
  mutation RestoreVersion($projectId: ID!, $versionId: ID!) {
    restoreVersion(projectId: $projectId, versionId: $versionId) {
      id
      title
      content
      updatedAt
    }
  }
`;

export const EXPORT_PNG_MUTATION = gql`
  mutation ExportPng($projectId: ID!) {
    exportPng(projectId: $projectId) {
      url
      fileName
      mimeType
    }
  }
`;

export const CREATE_SHARE_LINK_MUTATION = gql`
  mutation CreateShareLink($projectId: ID!, $expiresInHours: Float) {
    createShareLink(projectId: $projectId, expiresInHours: $expiresInHours) {
      url
      token
      expiresAt
    }
  }
`;
