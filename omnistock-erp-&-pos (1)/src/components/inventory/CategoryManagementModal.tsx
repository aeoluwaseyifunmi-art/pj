import React from 'react';
import { DatabaseState } from '../../db/databaseStore';
import { CategoryManagerModal } from '../products/CategoryManagerModal';

interface CategoryManagementModalProps {
  dbState: DatabaseState;
  onClose: () => void;
  onCategorySelected?: (category: string) => void;
}

export const CategoryManagementModal: React.FC<CategoryManagementModalProps> = ({
  dbState,
  onClose,
  onCategorySelected
}) => {
  return (
    <CategoryManagerModal
      dbState={dbState}
      onClose={onClose}
      onSelectCategory={onCategorySelected}
    />
  );
};
