import LeadsTable from '../components/LeadsTable';

/**
 * Review Leads (1st degree). Only Review and Rejected tabs; qualified leads appear in My Contacts.
 * Base query: connection_degree = '1st'. Tabs: Review (default), Rejected.
 */
export default function ConnectionsPage() {
  return (
    <LeadsTable
      baseQuery={{ connection_degree: '1st' }}
      showReviewTabs={true}
      showBackToReview={false}
      reviewTabs={['to_be_reviewed', 'rejected']}
      initialReviewTab="to_be_reviewed"
      listTitle="Review Leads"
    />
  );
}
