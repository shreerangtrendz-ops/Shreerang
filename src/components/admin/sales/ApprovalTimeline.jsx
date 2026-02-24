import React from 'react';
import { CheckCircle, Circle, Clock, XCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

const STEPS = [
    { id: 'Sales Manager', label: 'Sales Manager Review' },
    { id: 'Accountant', label: 'Accountant Check' },
    { id: 'Head Manager', label: 'Final Approval' }
];

const ApprovalTimeline = ({ currentStatus, approvalHistory = [] }) => {
    // Map status string to index for simple progress tracking
    // Statuses: 'Draft', 'Pending Approval', 'Approved', 'Confirmed', 'Rejected'
    
    // This is a simplified logic visualization
    const getStepStatus = (stepId) => {
        const approval = approvalHistory.find(h => h.approval_level === stepId);
        if (approval) {
            return approval.approval_status === 'Approved' ? 'completed' : 'rejected';
        }
        return 'pending';
    };

    return (
        <div className="space-y-4">
            <h4 className="text-sm font-medium">Authorization Workflow</h4>
            <div className="relative">
                <div className="absolute left-2.5 top-0 bottom-0 w-0.5 bg-slate-200" />
                <div className="space-y-6 relative">
                    {STEPS.map((step, idx) => {
                        const status = getStepStatus(step.id);
                        const record = approvalHistory.find(h => h.approval_level === step.id);
                        
                        return (
                            <div key={idx} className="flex gap-4 items-start ml-0.5">
                                <div className={cn(
                                    "rounded-full p-1 z-10",
                                    status === 'completed' ? "bg-green-100 text-green-600" :
                                    status === 'rejected' ? "bg-red-100 text-red-600" :
                                    "bg-slate-100 text-slate-400"
                                )}>
                                    {status === 'completed' ? <CheckCircle className="h-4 w-4" /> : 
                                     status === 'rejected' ? <XCircle className="h-4 w-4" /> : 
                                     <Circle className="h-4 w-4" />}
                                </div>
                                <div className="flex-1 pt-0.5">
                                    <p className={cn("text-sm font-medium leading-none", status === 'pending' && "text-muted-foreground")}>{step.label}</p>
                                    {record && (
                                        <div className="mt-1 text-xs text-muted-foreground">
                                            <p>By: {record.approved_by_name || 'User'}</p>
                                            <p className="italic">"{record.comments || 'No comments'}"</p>
                                            <p>{new Date(record.approval_date).toLocaleDateString()}</p>
                                        </div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default ApprovalTimeline;