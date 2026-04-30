import styled from 'styled-components';

export const Wrapper = styled.div`
  display: block;
  border-radius: 6px;
`;

export const Columns = styled.div`
  margin: -0.75rem;
  margin-bottom: 0.75rem;
  display: flex;
  flex-direction: column;
  padding: 0.75rem;
  gap: 8px;

  @media screen and (min-width: 769px) {
    display: flex;
  }
`;
export const Flex = styled.div`
  display: flex;
  flex-direction: row;
  gap: 8px;
  @media screen and (max-width: 1200px) {
    flex-direction: column;
  }
`;
export const FlexItem = styled.div`
  display: flex;
  flex-direction: column;
  gap: 8px;
  width: 18rem;
  @media screen and (max-width: 1450px) {
    width: 50%;
  }
  @media screen and (max-width: 1200px) {
    width: 100%;
  }
`;

export const NumberInput = styled.input`
  background-color: ${({ theme }) => theme.input.backgroundColor.normal};
  border: 1px ${({ theme }) => theme.input.borderColor.normal} solid;
  border-radius: 4px;
  color: ${({ theme }) => theme.input.color.normal};
  height: 32px;
  width: 100%;
  padding-left: 12px;
  font-size: 14px;

  &:hover {
    border-color: ${({ theme }) => theme.input.borderColor.hover};
  }

  &:focus {
    outline: none;
    border-color: ${({ theme }) => theme.input.borderColor.focus};
  }

  &:disabled {
    color: ${({ theme }) => theme.input.color.disabled};
    border-color: ${({ theme }) => theme.input.borderColor.disabled};
    background-color: ${({ theme }) => theme.input.backgroundColor.disabled};
    cursor: not-allowed;
  }
`;
