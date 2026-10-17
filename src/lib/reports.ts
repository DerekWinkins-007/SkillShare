export interface ReportDefinition {
  n: number;
  title: string;
  badge: string;
  sql: string;
  hasDeptFilter: boolean;
}

export const REPORT_DEFINITIONS: Record<number, ReportDefinition> = {
  1: {
    n: 1,
    title: 'Students by department',
    badge: '01_STUDENT_DEPT',
    sql: 'SELECT studentid, fname, lname, dept FROM student WHERE dept = <department>;',
    hasDeptFilter: true,
  },
  2: {
    n: 2,
    title: 'Skills with their category',
    badge: '02_SKILLS_CAT',
    sql: 'SELECT s.skillname, c.categoryname FROM skill s JOIN category c ON s.categoryid = c.categoryid;',
    hasDeptFilter: false,
  },
  3: {
    n: 3,
    title: 'Feedback summary',
    badge: '03_METRIC_SUMMARY',
    sql: 'SELECT COUNT(*) AS total_feedback, AVG(rating) AS avg_rating FROM student_gives_feedback;',
    hasDeptFilter: false,
  },
  4: {
    n: 4,
    title: 'Requests by status',
    badge: '04_REQ_STATUS',
    sql: 'SELECT status, COUNT(*) AS request_count FROM skill_request GROUP BY status;',
    hasDeptFilter: false,
  },
  5: {
    n: 5,
    title: 'Feedback received, highest rating first',
    badge: '05_FEEDBACK_RANK',
    sql: 'SELECT studentid, feedbackid, rating, comments FROM student_receives_feedback ORDER BY rating DESC;',
    hasDeptFilter: false,
  },
};
