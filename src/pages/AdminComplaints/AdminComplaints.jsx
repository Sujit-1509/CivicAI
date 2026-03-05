import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { ClipboardList, ArrowUpDown, Clock } from 'lucide-react';
import { getComplaints, updateComplaintStatus } from '../../services/api';
import { StatusBadge, SeverityBadge, CategoryTag, Loader, EmptyState, PriorityBar } from '../../components/Shared/Shared';
import './AdminComplaints.css';

const AdminComplaints = () => {
    const [complaints, setComplaints] = useState([]);
    const [loading, setLoading] = useState(true);
    const [sortField, setSortField] = useState('timestamp');
    const [sortDirection, setSortDirection] = useState('desc');
    const [statusFilter, setStatusFilter] = useState('all');
    const [updatingId, setUpdatingId] = useState(null);

    useEffect(() => {
        setLoading(true);
        // Admin gets all complaints, no user phone filter
        getComplaints().then((res) => {
            setComplaints(res.complaints || []);
            setLoading(false);
        });
    }, []);

    const handleSort = (field) => {
        if (sortField === field) {
            setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection('desc');
        }
    };

    const handleStatusChange = async (incidentId, newStatus) => {
        setUpdatingId(incidentId);
        try {
            const res = await updateComplaintStatus(incidentId, newStatus, "Status updated by admin");
            if (res.success) {
                // Update local state instead of refetching everything
                setComplaints(complaints.map(c =>
                    c.incident_id === incidentId ? { ...c, status: newStatus } : c
                ));
            } else {
                alert('Failed to update status');
            }
        } catch (error) {
            console.error(error);
            alert('Error updating status');
        } finally {
            setUpdatingId(null);
        }
    };

    const getSortedAndFilteredComplaints = () => {
        let filtered = complaints;
        if (statusFilter !== 'all') {
            filtered = complaints.filter(c => c.status === statusFilter);
        }

        return [...filtered].sort((a, b) => {
            let valA = a[sortField];
            let valB = b[sortField];

            // Handle date parsing for timestamp
            if (sortField === 'timestamp') {
                valA = new Date(valA).getTime() || 0;
                valB = new Date(valB).getTime() || 0;
            }

            // Handle special cases
            if (sortField === 'location') {
                valA = a.address || '';
                valB = b.address || '';
            }

            if (valA < valB) return sortDirection === 'asc' ? -1 : 1;
            if (valA > valB) return sortDirection === 'asc' ? 1 : -1;
            return 0;
        });
    };

    const displayedComplaints = getSortedAndFilteredComplaints();

    return (
        <div className="admin-complaints-page">
            <div className="container" style={{ maxWidth: '1200px' }}>
                <div className="ac-header">
                    <div>
                        <h1 className="section-title">All Complaints Overview</h1>
                        <p className="text-muted text-sm">Manage, sort, and update citizen issues</p>
                    </div>
                </div>

                <div className="ac-filters card">
                    <span className="filter-label">Filter Status:</span>
                    {['all', 'submitted', 'assigned', 'in_progress', 'resolved', 'closed'].map((s) => (
                        <button
                            key={s}
                            className={`filter-chip ${statusFilter === s ? 'active' : ''}`}
                            onClick={() => setStatusFilter(s)}
                        >
                            {s === 'all' ? 'All' : s.replace('_', ' ').replace(/\b\w/g, (c) => c.toUpperCase())}
                        </button>
                    ))}
                    <span className="results-count text-muted text-sm" style={{ marginLeft: 'auto' }}>
                        Showing {displayedComplaints.length} results
                    </span>
                </div>

                {loading ? (
                    <Loader text="Loading all complaints..." />
                ) : complaints.length === 0 ? (
                    <EmptyState
                        icon={<ClipboardList size={32} />}
                        title="No complaints in the system"
                        description="As an admin, you will see all complaints here once they are submitted."
                    />
                ) : (
                    <div className="card" style={{ padding: '0', overflowX: 'auto' }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Category</th>
                                    <th>Severity</th>
                                    <th onClick={() => handleSort('priorityScore')} className="sortable-header">
                                        Priority <ArrowUpDown size={12} className="sort-icon" />
                                    </th>
                                    <th onClick={() => handleSort('timestamp')} className="sortable-header">
                                        Date <ArrowUpDown size={12} className="sort-icon" />
                                    </th>
                                    <th onClick={() => handleSort('location')} className="sortable-header">
                                        Location <ArrowUpDown size={12} className="sort-icon" />
                                    </th>
                                    <th>Status & Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {displayedComplaints.map((c) => (
                                    <tr key={c.incident_id}>
                                        <td className="id-cell">
                                            <Link to={`/complaint/${c.incident_id}`}>{c.incident_id?.split('-').pop()}</Link>
                                        </td>
                                        <td><CategoryTag category={c.category} /></td>
                                        <td><SeverityBadge severity={c.severity} /></td>
                                        <td>
                                            <div style={{ width: '80px' }}>
                                                <PriorityBar score={c.priorityScore || 50} />
                                            </div>
                                        </td>
                                        <td className="date-cell">
                                            <div className="date-text">
                                                <Clock size={12} />
                                                {new Date(c.timestamp || c.createdAt).toLocaleDateString()}
                                            </div>
                                        </td>
                                        <td className="location-cell text-sm text-muted">
                                            <div className="truncate-text" title={c.address}>
                                                {c.address?.split(',')[0]}
                                            </div>
                                        </td>
                                        <td className="action-cell">
                                            {updatingId === c.incident_id ? (
                                                <span className="text-sm text-primary">Updating...</span>
                                            ) : (
                                                <select
                                                    className={`status-select status-${c.status || 'submitted'}`}
                                                    value={c.status || 'submitted'}
                                                    onChange={(e) => handleStatusChange(c.incident_id, e.target.value)}
                                                >
                                                    <option value="submitted">Submitted</option>
                                                    <option value="assigned">Assigned</option>
                                                    <option value="in_progress">In Progress</option>
                                                    <option value="resolved">Resolved</option>
                                                    <option value="closed">Closed</option>
                                                </select>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
};

export default AdminComplaints;
