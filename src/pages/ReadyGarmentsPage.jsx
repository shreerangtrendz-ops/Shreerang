import React from 'react';
import { Navigate } from 'react-router-dom';

const ReadyGarmentsPage = () => {
  // Redirect to the shop page with the "ready-garments" category pre-selected.
  return <Navigate to="/shop?categories=ready-garments" replace />;
};

export default ReadyGarmentsPage;