import React from 'react';
import { UploadFlow } from '../components/upload/UploadFlow';

export const AddBookPage: React.FC = () => {
  return (
    <div className="flat-page py-2 pb-16 sm:pb-20">
      <UploadFlow />
    </div>
  );
};
