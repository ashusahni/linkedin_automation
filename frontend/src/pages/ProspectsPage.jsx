import LeadsTable from '../components/LeadsTable';

/**
 * Prospects = 2nd & 3rd degree workflow.
 * Only Review and Rejected tabs; qualified leads live in My Contacts (no Qualified tab here).
 */
export default function ProspectsPage() {
  return (
    <LeadsTable
      baseQuery={{ connection_degree: '2nd,3rd' }}
      showReviewTabs={true}
      showBackToReview={false}
      reviewTabs={['to_be_reviewed', 'rejected']}
      initialReviewTab="to_be_reviewed"
    />
  );
}
