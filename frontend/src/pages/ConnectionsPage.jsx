import LeadsTable from '../components/LeadsTable';

/**
 * Review Leads = all leads except those in My Contacts (priority + 1st/2nd degree).
 * Tabs: Review (default), Rejected. No default date range so all leads are visible.
 */
export default function ConnectionsPage() {
  return (
    <LeadsTable
      baseQuery={{ review_leads: true }}
      showReviewTabs={true}
      showBackToReview={false}
      applyDefaultDateRange={false}
      reviewTabs={['to_be_reviewed', 'rejected']}
      initialReviewTab="to_be_reviewed"
      listTitle="Review Leads"
    />
  );
}
