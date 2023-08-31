import {
    Button,
    FormControl,
    Icon,
    IconButton,
    Input,
    Tab,
    TabClassKey,
    Tabs,
    Badge,
    DialogActions,
    Select,
    styled,
    BadgeProps,
    ListItemIcon,
    Popover,
    MenuItem,
    DialogContent,
} from '@material-ui/core';
import { ToggleButton } from '@material-ui/lab';
import { getAgentUserMapping, getLummUsers } from 'Admin/reducers';
import { BodyScrollEvent, GridApi } from 'ag-grid-community';
import { AgGridReact } from 'ag-grid-react';
import { history as appHistory } from 'app.history';
import CenteredToolbar from 'Components/library/CenteredToolbar';
import { format } from 'date-fns';
import { css, cx } from '@emotion/css';
import * as Models from 'Global/models';
import {
    PendingTab,
    StagingValidationType,
    MemberStagingRecord,
    StagingValidationRecord,
    Employer,
} from 'Global/models';
import { AdminActions, EmployerActions } from 'Init/actions';
import { RootState } from 'Init/state';
import _, { isEmpty, throttle, debounce } from 'lodash';
import React, { ChangeEvent, Component, useCallback } from 'react';
import { connect, useDispatch, useSelector } from 'react-redux';
import { Redirect, RouteComponentProps, useRouteMatch } from 'react-router';
import { isDesktop, palette, isSmallerThan } from 'Utilities/theme';
import {
    HttpClient,
    Toast,
    formatHireDate,
    formatNumber,
    formatPhoneNumber,
    fromUTC,
    fuzzyFilter,
    queryClient,
    stringToColor,
} from 'Utilities/utils';
import PendingMemberDialog from './member.dialog';
import PendingServerSideDatasource from './pendingServerSideDatasource';
import ViewChangesDialog from './view.changes.dialog';
import { ChangeDetectionStrategyType } from 'ag-grid-react/lib/changeDetectionService';
import { LoadingWrapper } from 'Components/library/LoadingWrapper';
import { ActionList } from './ActionList';
import {
    usePendingCounts,
    usePendingPublicDocumentSubmissions,
} from 'Employers/employerQueryHooks';
import message from 'Utilities/message';
import { PublicDocumentsList } from './PublicDocumentsList';
import {
    AccountCircleOutlined,
    BlockOutlined,
    CheckOutlined,
    DescriptionOutlined,
    FilterListOutlined,
    FindInPageOutlined,
    MoreVertOutlined,
    RefreshOutlined,
    MoreVert,
    AddCircleOutlineOutlined,
    SearchOutlined,
} from '@material-ui/icons';
import { DropdownIconButton } from 'Components/library/DropdownButton';
import '../Search/search.styles.scss';
import { getHasDocumentAccess } from 'Authentication/reducers';
import { SDialog } from 'Components/library/SDialog';
import Tags from 'react-tag-autocomplete';
import { Ufcw } from 'Global/ufcwConstants';
import { MatchPotentialMemberDialog } from './MatchPotentialMemberDialog';
import { ActionCreators } from 'Components/actions';

interface StateProps {
    pendingRecords: Models.MemberStagingRecord[];
    loading: boolean;
    dropdownEmployers: Models.Employer[];
    loadingPendingValidation: boolean;
    pendingValidationRecords: Models.StagingValidationRecord[];
    userCheckLoading: boolean;
    selectedEmployee: Models.Employee;
    applicationUsers: Models.ApplicationUser[];
    agents: Models.Agent[];
    showCompleted: boolean;
    userId: string;
    userAgentMap: ReturnType<typeof getAgentUserMapping>;
    navHistory: RootState['Navigation']['history'];
    hasDocumentAccess: boolean;
}

interface DispatchProps {
    fetchPending: typeof EmployerActions.FetchPending.Request;
    fetchAgents: typeof ActionCreators.FetchAllAgents.Request;
    backToSearch: typeof EmployerActions.BackToSearch;
    acceptPending: typeof EmployerActions.AcceptPending.Request;
    rejectPending: typeof EmployerActions.RejectPending.Request;
    employerSearch: typeof EmployerActions.EmployerSearch.Request;
    validatePending: typeof EmployerActions.ValidatePending.Request;
    checkEmployee: typeof EmployerActions.CheckEmployee;
    selectEmployee: typeof EmployerActions.SelectEmployeeByID;
    fetchActions: typeof AdminActions.FetchActions.Request;
    fetchPendingActionResponses: typeof EmployerActions.FetchPendingActionResponses.Request;
    toggleShowCompleted: typeof EmployerActions.TogglePendingShowCompleted;
    resolveAction: typeof EmployerActions.ResolveAction.Request;
    fetchPendingCount: typeof EmployerActions.FetchPendingCount.Request;
}

interface PassedProps {
    pendingCounts: RootState['Employer']['pendingCounts'];
}

interface State {
    showMemberModal: boolean;
    selectedPendingRecord: Models.MemberStagingRecord;
    selectedValidationRecord: Models.StagingValidationRecord;
    showChangesModal: boolean;
    showPotentialMatchesModal: boolean;
    selectedTab: PendingTab;
    searchQuery: string;
    showActionModal: boolean;
    rowData: any[];
    showActionFiltersDialog: boolean;
    gridApi?: GridApi;
    hideHelp: boolean;
    collapseMobileSearch: boolean;
    pendingRowData: MemberStagingRecord[];
    showTagModal: boolean;
    showMatchModal: boolean;
    tags: { id: string; name: string }[];
}

type Props = StateProps &
    DispatchProps &
    PassedProps &
    RouteComponentProps<{ pendingType: PendingTab; recordId: string }>;

const stateToProps = (state: RootState) => ({
    pendingRecords: state.Employer.pendingRecords,
    loading: state.Employer.loading > 0,
    dropdownEmployers: state.Employer.dropdownEmployers,
    loadingPendingValidation: state.Employer.loadingPendingValidation,
    pendingValidationRecords: state.Employer.pendingValidationRecords,
    userCheckLoading: state.Employer.userCheckLoading,
    selectedEmployee: state.Employer.selectedEmployee,
    applicationUsers: getLummUsers(state),
    agents: state.Component.agents,
    showCompleted: state.Employer.ui.pendingShowCompleted,
    userId: state.Authentication.userId,
    userAgentMap: getAgentUserMapping(state),
    navHistory: state.Navigation.history,
    hasDocumentAccess: getHasDocumentAccess(state),
});

const dispatchToProps = {
    fetchPending: EmployerActions.FetchPending.Request,
    fetchAgents: ActionCreators.FetchAllAgents.Request,
    backToSearch: EmployerActions.BackToSearch,
    acceptPending: EmployerActions.AcceptPending.Request,
    rejectPending: EmployerActions.RejectPending.Request,
    employerSearch: EmployerActions.EmployerSearch.Request,
    validatePending: EmployerActions.ValidatePending.Request,
    checkEmployee: EmployerActions.CheckEmployee,
    selectEmployee: EmployerActions.SelectEmployeeByID,
    fetchActions: AdminActions.FetchActions.Request,
    fetchPendingActionResponses:
        EmployerActions.FetchPendingActionResponses.Request,
    toggleShowCompleted: EmployerActions.TogglePendingShowCompleted,
    resolveAction: EmployerActions.ResolveAction.Request,
    fetchPendingCount: EmployerActions.FetchPendingCount.Request,
};

const ListItem = ({ children }) => (
    <div
        style={{
            margin: '4px 16px 4px 0',
        }}
    >
        {children}
    </div>
);

const tabClasses: Partial<Record<TabClassKey, string>> = {
    root: css({
        width: 200,
        minHeight: 48,
    }),
    wrapper: 'flex-row',
    labelIcon: css({
        '.fa': {
            marginBottom: '0 !important',
            marginRight: 4,
        },
        svg: {
            marginBottom: '0 !important',
            marginRight: 4,
        },
    }),
};

const StyledBadge = styled(Badge)<BadgeProps>(() => ({
    '&.MuiBadge-root': {
        width: '100%',
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
    },
    '& .MuiBadge-badge': {
        backgroundColor: '#D9E6EC',
        color: '#025B80',
        fontSize: 14,
        fontWeight: 'medium',
        right: 0,
        top: 'auto',
        padding: '0 6px',
        transform: 'none',
    },
}));

class PendingList extends Component<Props, State> {
    pendingDataSource: PendingServerSideDatasource =
        new PendingServerSideDatasource();

    constructor(props: Props) {
        super(props);

        const currentTab = this.getTabFromRoute();

        this.state = {
            showMemberModal: false,
            selectedPendingRecord: null,
            selectedValidationRecord: null,
            showChangesModal: false,
            showPotentialMatchesModal: false,
            selectedTab: currentTab,
            searchQuery: '',
            showActionModal: false,
            rowData: [],
            showActionFiltersDialog: false,
            hideHelp: false,
            collapseMobileSearch: true,
            pendingRowData: [],
            showTagModal: false,
            showMatchModal: false,
            tags: [],
        };
    }

    toggleShowChangesModal = (record: Models.MemberStagingRecord) => {
        this.setState({
            showChangesModal: !this.state.showChangesModal,
            selectedPendingRecord: record,
        });
    };

    onViewChangesClick = (record: Models.MemberStagingRecord) => {
        this.toggleShowChangesModal(record);
    };

    hideShowChangesModal = () => {
        this.toggleShowChangesModal(null);
    };

    getValidationBtnCls = (
        validationRecord: Models.StagingValidationRecord
    ): any => {
        if (validationRecord.validationCodes.length <= 1) {
            switch (validationRecord.validationCodes[0]) {
                case StagingValidationType.Conflict:
                    return 'fa fa-warning';
                case StagingValidationType.Match:
                    return 'fa fa-check';
                case StagingValidationType.DuplicatePending:
                    return 'fa fa-warning';
                case StagingValidationType.WorkflowError:
                    return 'fa fa-warning';
                case StagingValidationType.Deleted:
                    return 'fa fa-warning';
                case StagingValidationType.XRefConflict:
                    return 'fa fa-warning';
                case StagingValidationType.PotentialMatches:
                    return 'fa fa-warning';
                default:
                    return '';
            }
        } else {
            return 'fa fa-warning';
        }
    };

    getValidationText = (
        validationRecord: Models.StagingValidationRecord
    ): any => {
        if (validationRecord.validationCodes.length <= 1) {
            switch (validationRecord.validationCodes[0]) {
                case StagingValidationType.Conflict:
                    return 'SSN Found - Conflict';
                case StagingValidationType.Match:
                    return 'SSN Found - Match';
                case StagingValidationType.DuplicatePending:
                    return 'Duplicate Pending';
                case StagingValidationType.WorkflowError:
                    return 'Workflow Error';
                case StagingValidationType.Deleted:
                    return 'Member Error';
                case StagingValidationType.XRefConflict:
                    return 'XRef Conflict';
                case StagingValidationType.PotentialMatches:
                    return 'Potential Match';
                default:
                    return '';
            }
        } else {
            return `${validationRecord.validationCodes.length} Errors`;
        }
    };

    onErrorButtonTap = (
        pendingRecord: Models.MemberStagingRecord,
        validationRecord: Models.StagingValidationRecord
    ): any => {
        if (
            validationRecord.validationCodes.includes(
                StagingValidationType.Conflict
            ) ||
            validationRecord.validationCodes.includes(
                StagingValidationType.Match
            ) ||
            validationRecord.validationCodes.includes(
                StagingValidationType.WorkflowError
            ) ||
            validationRecord.validationCodes.includes(
                StagingValidationType.Deleted
            ) ||
            validationRecord.validationCodes.includes(
                StagingValidationType.XRefConflict
            ) ||
            validationRecord.validationCodes.includes(
                StagingValidationType.PotentialMatches
            )
        ) {
            this.toggleMemberModal(pendingRecord, validationRecord);
        }
    };

    changeTab = (event: ChangeEvent<{}>, value: any) => {
        const tab = Object.keys(PendingTab)[value];
        this.props.history.push(`/pending/${tab.toLowerCase()}`);
    };

    handleGridScroll = throttle((e: BodyScrollEvent) => {
        if (e.top > 10 && !this.state.hideHelp) {
            this.setState({
                hideHelp: true,
            });
        } else if (e.top <= 10 && this.state.hideHelp) {
            this.setState({
                hideHelp: false,
            });
        }
    }, 150);

    onSearch = (newValue: string) => {
        this.setState({ searchQuery: newValue });
    };

    toggleShowCompleted = () => {
        this.props.toggleShowCompleted(!this.props.showCompleted);
    };

    componentDidMount() {
        if (_.isEmpty(this.props.dropdownEmployers)) {
            this.props.employerSearch({} as any);
        }

        if (_.isEmpty(this.props.agents)) {
            this.props.fetchAgents(null);
        }

        this.props.fetchPendingCount();

        this.fetchDataForTab();
    }

    getRecordTypeFromTab = (tab: PendingTab): Models.StagingRecordType => {
        if (tab === PendingTab.EDITS) {
            return Models.StagingRecordType.Edit;
        } else if (tab == PendingTab.JOINS) {
            return Models.StagingRecordType.Join;
        }
    };

    showActionModal = () => {
        this.setState({
            showActionModal: true,
        });
    };

    hideActionModal = () => {
        this.setState({
            showActionModal: false,
        });
    };

    showTagModal = (record: Models.MemberStagingRecord) => {
        this.setState({ showTagModal: true, selectedPendingRecord: record });
    };

    hideTagModal = () => {
        this.setState({ showTagModal: false, selectedPendingRecord: null });
    };

    showMatchModal = (
        record: Models.MemberStagingRecord,
        validationRecord: Models.StagingValidationRecord
    ) => {
        this.setState({
            showMatchModal: true,
            selectedPendingRecord: record,
            selectedValidationRecord: validationRecord,
        });
    };

    hideMatchModal = () => {
        this.setState({
            showMatchModal: false,
        });
    };

    onAcceptMatch = async (matchedMember: Models.Member) => {
        matchedMember = {
            ...matchedMember,
            ...this.state?.selectedPendingRecord?.memberBlob?.Root,
            ssn: matchedMember.ssn,
            ssN_4: matchedMember.ssN_4,
            ssN_5: matchedMember.ssN_5,
        };

        const record = this.state.selectedPendingRecord;
        record.ssn = matchedMember.ssn;
        record.memberBlob.Root = matchedMember;

        this.onAcceptClick(record, this.state.selectedValidationRecord);
        this.hideMatchModal();
        this.toggleMemberModal(null, null);
    };

    refresh = () => {
        this.props.fetchPendingCount();
        this.fetchDataForTab();
    };

    fetchDataForTab = () => {
        const { selectedTab } = this.state;

        if (selectedTab === PendingTab.ACTIONS) {
            queryClient.invalidateQueries('action/responses/pending');
        } else if (selectedTab === PendingTab.DOCUMENTS) {
            queryClient.invalidateQueries(
                usePendingPublicDocumentSubmissions.queryKey
            );
        } else {
            if (this.props.showCompleted) {
                this.state.gridApi?.setServerSideDatasource(
                    this.pendingDataSource
                );
            } else {
                this.props.fetchPending(null);
                this.props.validatePending(null);
            }
        }
    };

    componentDidUpdate(prevProps: Props, prevState: State) {
        const { selectedTab } = this.state;
        if (prevProps.match !== this.props.match) {
            this.setState({ selectedTab: this.getTabFromRoute() });
        }

        if (selectedTab !== prevState.selectedTab) {
            this.props.fetchPendingCount();
            if ([PendingTab.JOINS, PendingTab.EDITS].includes(selectedTab)) {
                if (this.props.showCompleted) {
                    this.pendingDataSource.setType(
                        this.state.selectedTab === PendingTab.JOINS
                            ? 'JOIN'
                            : 'EDIT'
                    );
                    this.state.gridApi?.setServerSideDatasource(
                        this.pendingDataSource
                    );
                } else if (isEmpty(this.props.pendingRecords)) {
                    this.fetchDataForTab();
                } else {
                    this.setState({
                        pendingRowData: this.filterPending(),
                    });
                }
            } else if ([PendingTab.ACTIONS].includes(selectedTab)) {
                if (isEmpty(this.state.rowData)) {
                    this.fetchDataForTab();
                }
            }
        }

        if (
            this.state.searchQuery !== prevState.searchQuery &&
            this.props.showCompleted
        ) {
            this.doSearch();
        }

        if (this.state.gridApi !== prevState.gridApi) {
            this.pendingDataSource.setGridApi(this.state.gridApi);
            this.state.gridApi?.setServerSideDatasource(this.pendingDataSource);
        }

        if (
            this.props.pendingRecords !== prevProps.pendingRecords ||
            this.state.searchQuery !== prevState.searchQuery
        ) {
            this.setState({
                pendingRowData: this.filterPending(),
            });
        }
    }

    doSearch = debounce(() => {
        this.pendingDataSource.setQuery(this.state.searchQuery);
        this.state.gridApi?.setServerSideDatasource(this.pendingDataSource);
    }, 250);

    getTabFromRoute = () => {
        return (
            (this.props.match && this.props.match.params.pendingType) ||
            PendingTab.EDITS
        );
    };

    getSelectedRecordFromRoute = (): number | undefined => {
        return this.props.match
            ? parseInt(this.props.match.params.recordId)
            : undefined;
    };

    onAcceptClick = (
        record: Models.MemberStagingRecord,
        validationRecord?: StagingValidationRecord
    ) => {
        if (
            validationRecord?.validationCodes.includes(
                StagingValidationType.Deleted
            )
        ) {
            message.show(
                'Accept Deleted Record?',
                'The employee has been deleted. Accepting this will restore that member, and may result in duplicates.',
                ({ onClose }) => (
                    <DialogActions>
                        <Button
                            onClick={() => {
                                this.props.acceptPending(record);
                                onClose();
                            }}
                        >
                            Accept
                        </Button>
                        <Button
                            onClick={() => {
                                onClose();
                            }}
                            color="primary"
                            variant="contained"
                        >
                            Cancel
                        </Button>
                    </DialogActions>
                )
            );

            return;
        }

        this.props.acceptPending(record);
    };

    onRejectClick = (record: Models.MemberStagingRecord) => {
        this.props.rejectPending(record);
    };

    isCompleted = (record: Models.MemberStagingRecord): boolean => {
        return !!(record.dateAccepted || record.dateRejected);
    };

    getCompletedBy = (record: Models.MemberStagingRecord): JSX.Element => {
        const user = this.lookupNameFromUserId(
            record.userAccepted || record.userRejected
        );
        const actionText = record.dateAccepted
            ? 'Accepted'
            : record.dateRejected
            ? 'Rejected'
            : '';
        const date = record.dateAccepted || record.dateRejected;
        return (
            <div>
                {actionText}
                {user && ` by ${user}`}
                {date && ` on ${format(fromUTC(date), 'MM/dd/yyyy')}`}
            </div>
        );
    };

    getCreatedByText = (record: Models.MemberStagingRecord): string => {
        return record.addedBy;
    };

    getCompletedDateText = (record: Models.MemberStagingRecord): string => {
        if (record.dateAccepted) {
            return `Accepted: ${format(
                fromUTC(record.dateAccepted),
                'MM/dd/yyyy'
            )}`;
        } else if (record.dateRejected) {
            return `Rejected: ${format(
                fromUTC(record.dateRejected),
                'MM/dd/yyyy'
            )}`;
        } else {
            return '';
        }
    };

    handleCompletedRecordTap = ({ data }) => {
        this.props.selectEmployee(data.ssn);
    };

    getIconType = (
        record: Models.MemberStagingRecord,
        validationRecord: Models.StagingValidationRecord
    ) => {
        if (record.dateAccepted) {
            return cx(
                'fa-check',
                css({
                    color: palette.timesheetGreen,
                })
            );
        } else if (record.dateRejected) {
            return cx(
                'fa-ban',
                css({
                    color: palette.gray,
                })
            );
        } else if (record.type === Models.StagingRecordType.Edit) {
            return 'fa-pencil';
        } else if (
            !validationRecord ||
            _.isEmpty(validationRecord.validationCodes)
        ) {
            return 'fa-user-plus';
        } else {
            return 'fa-user';
        }
    };

    mobileListTemplate = ({ data }) => {
        const record: Models.MemberStagingRecord = data;
        const member = record.memberBlob.Root;
        const employer =
            this.props.dropdownEmployers &&
            this.props.dropdownEmployers.find(
                (emp) => emp.employerNumber === member.employerId
            );
        const validationRecord = this.props.pendingValidationRecords.find(
            (r) => r.memberStagingRecordId === record.id
        );

        const showCompareButton =
            validationRecord &&
            validationRecord.validationCodes.some((code) => {
                return [
                    StagingValidationType.Match,
                    StagingValidationType.Conflict,
                    StagingValidationType.DuplicatePending,
                ].includes(code);
            });

        return (
            <div
                className={cx(
                    'flex justify-between',
                    css({
                        padding: 16,
                        height: 272,
                        color: 'rgba(0, 0, 0, 0.8)',
                    })
                )}
            >
                <div
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'visible',
                    }}
                >
                    <div
                        className={cx(
                            'flex justify-between',
                            css({
                                color: 'rgba(0, 0, 0, 0.8)',
                            })
                        )}
                    >
                        <h2
                            style={{
                                margin: 0,
                            }}
                        >
                            <span
                                className={
                                    'fa fa-fw ' +
                                    this.getIconType(record, validationRecord)
                                }
                            />
                            <span
                                style={{
                                    margin: '0 8px',
                                }}
                            >
                                {member.firstName} {member.lastName}
                            </span>
                        </h2>
                    </div>
                    <div
                        className={css({
                            padding: '0 0 0 36px',
                        })}
                    >
                        <div>
                            {this.isCompleted(record) &&
                                this.getCompletedBy(record)}
                        </div>
                        <div className="flex">
                            <div className="flex flex-col">
                                <ListItem>
                                    <span style={{ fontWeight: 600 }}>
                                        SSN:
                                    </span>{' '}
                                    {member.ssn}
                                </ListItem>
                                <ListItem>
                                    <span>
                                        <span style={{ fontWeight: 600 }}>
                                            Home:
                                        </span>{' '}
                                        {formatPhoneNumber(member.phoneNum)}
                                    </span>
                                </ListItem>
                            </div>
                            <div className="flex flex-col">
                                <ListItem>
                                    <span>
                                        <span style={{ fontWeight: 600 }}>
                                            Request Date:
                                        </span>{' '}
                                        {format(
                                            fromUTC(record.dateUpdated),
                                            'MM/dd/yyyy'
                                        )}
                                    </span>
                                </ListItem>
                                <ListItem>
                                    <span>
                                        <span style={{ fontWeight: 600 }}>
                                            Cell:
                                        </span>{' '}
                                        {formatPhoneNumber(member.cellPhone)}
                                    </span>
                                </ListItem>
                            </div>
                            <div className="flex flex-col">
                                <ListItem>
                                    <span>
                                        <span style={{ fontWeight: 600 }}>
                                            Hire Date:
                                        </span>{' '}
                                        {formatHireDate(member.origHireDate)}
                                    </span>
                                </ListItem>
                            </div>
                        </div>

                        <div className="flex">
                            <ListItem>
                                <span style={{ fontWeight: 600 }}>
                                    Added By:
                                </span>{' '}
                                ' {this.getCreatedByText(record)}'
                            </ListItem>
                        </div>
                        <div>
                            {employer && (
                                <ListItem>
                                    <div>
                                        <span>
                                            <span style={{ fontWeight: 600 }}>
                                                Employer ID:
                                            </span>{' '}
                                            {employer.employerNumber}
                                        </span>
                                    </div>
                                    <div className="lighter-font">
                                        <span>{employer.name}</span>
                                    </div>
                                    <div>
                                        {employer.address1.length > 0 && (
                                            <span>
                                                <span>{employer.address1}</span>
                                            </span>
                                        )}
                                        {employer.address2.length > 0 &&
                                            isDesktop() && (
                                                <span>
                                                    <span>
                                                        {employer.address2}
                                                    </span>
                                                </span>
                                            )}
                                    </div>
                                    <div className="lighter-font">
                                        <span>
                                            {employer.city}, {employer.state}{' '}
                                            {employer.zipCode}
                                        </span>
                                    </div>
                                </ListItem>
                            )}
                        </div>
                        {!this.isCompleted(record) && (
                            <div className="flex mt-16">
                                <button
                                    className="green mr-8"
                                    onClick={() => this.onAcceptClick(record)}
                                >
                                    <div className="fa fa-fw fa-lg fa-check mr-8" />
                                    Accept
                                </button>
                                <button
                                    className="gray mr-8"
                                    onClick={() => this.onRejectClick(record)}
                                >
                                    <div className="fa fa-fw fa-lg fa-ban mr-8" />
                                    Reject
                                </button>
                                {showCompareButton && (
                                    <button
                                        className="secondary"
                                        onClick={() =>
                                            this.onViewChangesClick(record)
                                        }
                                    >
                                        <div className="fa fa-fw fa-lg fa-search mr-8" />
                                        View Changes
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                </div>
                <div className="flex flex-col">
                    {record.isRejoin ? (
                        <button
                            className="primary small pill "
                            onClick={() => {
                                this.props.selectEmployee(member.ssn);
                            }}
                        >
                            <div className="fa fa-user mr-8" />
                            View Member
                        </button>
                    ) : (
                        <button
                            className="primary small pill"
                            onClick={() => {
                                this.viewApp(record);
                            }}
                        >
                            <span className="fa fa-file-text-o mr-8" />
                            View Application
                        </button>
                    )}
                    {validationRecord &&
                        validationRecord.validationCodes.length > 0 && (
                            <button
                                className="small pill secondary mt-8"
                                onClick={() =>
                                    this.onErrorButtonTap(
                                        record,
                                        validationRecord
                                    )
                                }
                            >
                                <span
                                    className={cx(
                                        'fa mr-8',
                                        this.getValidationBtnCls(
                                            validationRecord
                                        )
                                    )}
                                />
                                {this.getValidationText(validationRecord)}
                            </button>
                        )}
                </div>
            </div>
        );
    };

    viewApp = (record) => {
        window.open(record['uri']);
    };

    toggleMemberModal = (
        pendingRecord: Models.MemberStagingRecord,
        validationRecord: Models.StagingValidationRecord
    ) => {
        this.setState({
            showMemberModal: !this.state.showMemberModal,
            selectedPendingRecord: pendingRecord,
            selectedValidationRecord: validationRecord,
        });
    };

    filterPending = () => {
        const { searchQuery } = this.state;
        let records = this.props.pendingRecords.filter(
            (r) => r.type === this.getRecordTypeFromTab(this.state.selectedTab)
        );
        if (searchQuery) {
            records = records.filter((r) => {
                let { firstName, lastName } = r.memberBlob.Root;
                let ssn = r.ssn;
                firstName = firstName || '';
                lastName = lastName || '';
                ssn = ssn || '';
                const userString =
                    firstName.toLowerCase() +
                    lastName.toLowerCase() +
                    ssn.toLowerCase();
                return fuzzyFilter(searchQuery, userString);
            });
        }
        return records;
    };

    handleBack = () => {
        const routeIndex = this.props.navHistory
            .reverse()
            .findIndex((r) => r.split('/').length <= 2);

        appHistory.go(-1 * (routeIndex + 1));
    };

    handleTagAddition = (tag) => {
        const existingTags = this.state.tags.filter(
            (oldTag) => oldTag.name === tag.name
        );

        if (existingTags.length || (tag?.name?.length == 0 ?? true)) {
            return;
        }

        const newTags = [
            { id: tag.name.trim(), name: tag.name.trim() },
            ...this.state.tags,
        ];

        this.setState({
            tags: newTags,
        });
    };

    handleTagDelete = (i) => {
        const tags = [...this.state.tags];
        tags.splice(i, 1);
        this.setState({
            tags,
        });
    };

    handleStagingRecordUpdate = async () => {
        const record = this.state.selectedPendingRecord;
        record.memberBlob.Root['skfTags'] = this.state.tags?.map((t) => t.name);
        const response = await HttpClient.post(
            `${Ufcw.API_URI}/api/onboardingmember/staging/update`,
            record
        )
            .toPromise()
            .then((res) => !!res.response)
            .catch(() => {
                Toast.error(
                    'Error Applying Tags',
                    `Please contact your local administrator with error code: STAGING-U${record.id}`
                );
                return false;
            });
        if (response) {
            this.props.fetchPending(null);
        }
        this.hideTagModal();
    };

    tagsUpdateDisabled = () => {
        if (
            _.isArray(
                this.state.selectedPendingRecord?.memberBlob.Root['skfTags']
            )
        ) {
            return (
                this.state.selectedPendingRecord?.memberBlob.Root['skfTags']
                    .join(' ')
                    .trim() ==
                    this.state.tags
                        .map((t) => t.name)
                        .join(' ')
                        .trim() &&
                this.state.selectedPendingRecord?.memberBlob.Root['skfTags']
                    .length == this.state.tags.length
            );
        } else {
            return (
                this.state.selectedPendingRecord?.memberBlob.Root[
                    'skfTags'
                ]?.trim() ==
                    this.state.tags
                        .map((t) => t.name)
                        .join(' ')
                        .trim() &&
                [this.state.selectedPendingRecord?.memberBlob.Root['skfTags']]
                    .length == this.state.tags.length
            );
        }
    };
    render() {
        const {
            selectedTab,
            selectedPendingRecord,
            showActionFiltersDialog,
            hideHelp,
            collapseMobileSearch,
        } = this.state;

        // This is bad and awful and I hate it
        const tabIndex =
            selectedTab === PendingTab.JOINS
                ? 0
                : selectedTab === PendingTab.EDITS
                ? 1
                : selectedTab === PendingTab.ACTIONS
                ? 2
                : 3;
        const { showCompleted, pendingCounts, hasDocumentAccess } = this.props;
        const tabName =
            selectedTab === PendingTab.JOINS
                ? '/pending/joins'
                : selectedTab === PendingTab.EDITS
                ? '/pending/edits'
                : selectedTab === PendingTab.ACTIONS
                ? '/pending/actions'
                : '/pending/documents';

        return (
            <LoadingWrapper
                loading={this.props.loading}
                className="flex h-full flex-col overflow-auto border-solid border-0 lg:border-t border-blue-700"
            >
                {!isSmallerThan('large') && (
                    <CenteredToolbar title="">
                        <FormControl color="secondary" size="small">
                            <Input
                                startAdornment={
                                    <Icon className="fa fa-fw fa-search" />
                                }
                                endAdornment={
                                    this.state.searchQuery && (
                                        <Icon
                                            className="fa fa-fw fa-times cursor-pointer"
                                            onClick={() =>
                                                this.setState({
                                                    searchQuery: '',
                                                })
                                            }
                                        />
                                    )
                                }
                                onChange={(e) => {
                                    this.onSearch(e.target.value);
                                }}
                                classes={{
                                    root: cx(
                                        'text-white',
                                        css({
                                            '&:before': {
                                                borderColor: '#fff',
                                            },
                                        })
                                    ),
                                    underline: css({
                                        '&:before': {
                                            borderColor: '#fff !important',
                                        },
                                    }),
                                }}
                                value={this.state.searchQuery ?? ''}
                            />
                        </FormControl>
                        <div className="flex-1"></div>
                        {selectedTab !== PendingTab.ACTIONS && (
                            <ToggleButton
                                className="border-none mr-8 text-white"
                                selected={this.props.showCompleted}
                                onClick={this.toggleShowCompleted}
                                size="small"
                                value="completed"
                            >
                                <>
                                    <Icon className="fa fa-filter fa-fw text-white" />{' '}
                                    <span className="text-white">
                                        Show Completed
                                    </span>
                                </>
                            </ToggleButton>
                        )}
                        {selectedTab === PendingTab.ACTIONS && (
                            <Button
                                startIcon={
                                    <Icon className="fa fa-filter fa-fw text-white" />
                                }
                                className="text-white border-none mr-8"
                                onClick={() => {
                                    this.setState({
                                        showActionFiltersDialog: true,
                                    });
                                }}
                            >
                                Filter
                            </Button>
                        )}
                        <Button
                            startIcon={
                                <Icon className="fa fa-refresh fa-fw text-white" />
                            }
                            className="text-white border-none mr-8"
                            onClick={this.fetchDataForTab}
                        >
                            Refresh
                        </Button>
                    </CenteredToolbar>
                )}
                {!isSmallerThan('large') && (
                    <Tabs
                        value={tabIndex}
                        centered
                        onChange={this.changeTab}
                        className={css({
                            background: palette.blue,
                            color: 'white',
                        })}
                    >
                        <Tab
                            icon={<Icon className="fa fa-fw fa-user-plus" />}
                            label={
                                <Badge
                                    badgeContent={formatNumber(
                                        pendingCounts.joins
                                    )}
                                    overlap="rectangular"
                                    invisible={!pendingCounts.joins}
                                    color="secondary"
                                >
                                    Joins
                                </Badge>
                            }
                            classes={tabClasses}
                        />
                        <Tab
                            label={
                                <Badge
                                    badgeContent={formatNumber(
                                        pendingCounts.edits
                                    )}
                                    invisible={!pendingCounts.edits}
                                    color="secondary"
                                    overlap="rectangular"
                                >
                                    Edits
                                </Badge>
                            }
                            icon={<Icon className="fa fa-pencil" />}
                            classes={tabClasses}
                        />
                        <Tab
                            label={
                                <Badge
                                    badgeContent={formatNumber(
                                        pendingCounts.actions
                                    )}
                                    invisible={!pendingCounts.actions}
                                    color="secondary"
                                    overlap="rectangular"
                                >
                                    Actions
                                </Badge>
                            }
                            icon={<Icon className="fa fa-clipboard" />}
                            classes={tabClasses}
                        />
                        {hasDocumentAccess && (
                            <Tab
                                label={
                                    <Badge
                                        badgeContent={formatNumber(
                                            pendingCounts.publicDocuments
                                        )}
                                        invisible={
                                            !pendingCounts.publicDocuments
                                        }
                                        color="secondary"
                                        overlap="rectangular"
                                    >
                                        Documents
                                    </Badge>
                                }
                                icon={
                                    <DescriptionOutlined className="text-base" />
                                }
                                classes={tabClasses}
                            />
                        )}
                    </Tabs>
                )}
                {isSmallerThan('large') && (
                    <div className="w-full flex items-center justify-between bg-white h-56 border-solid border-0 border-b border-gray-200 px-12">
                        <div>
                            <Select
                                className="h-full font-medium text-gray-900 text-base sm:text-lg w-148"
                                disableUnderline
                                // value={currentRoute?.path ?? '/'}
                                value={tabName}
                                onChange={(e) => {
                                    this.props.history.push(e.target.value);
                                }}
                                classes={{
                                    select: 'focus:bg-transparent',
                                }}
                            >
                                <MenuItem
                                    value="/pending/joins"
                                    className="px-16"
                                >
                                    <StyledBadge
                                        badgeContent={formatNumber(
                                            pendingCounts.joins
                                        )}
                                        invisible={!pendingCounts.joins}
                                        color="default"
                                    >
                                        Joins
                                    </StyledBadge>
                                </MenuItem>
                                <MenuItem
                                    value="/pending/edits"
                                    className="px-16"
                                >
                                    <StyledBadge
                                        badgeContent={formatNumber(
                                            pendingCounts.edits
                                        )}
                                        invisible={!pendingCounts.edits}
                                        color="default"
                                    >
                                        Edits
                                    </StyledBadge>
                                </MenuItem>
                                <MenuItem
                                    value="/pending/actions"
                                    className="px-16"
                                >
                                    <StyledBadge
                                        badgeContent={formatNumber(
                                            pendingCounts.actions
                                        )}
                                        invisible={!pendingCounts.actions}
                                        color="default"
                                    >
                                        Actions
                                    </StyledBadge>
                                </MenuItem>
                                {hasDocumentAccess && (
                                    <MenuItem
                                        value="/pending/documents"
                                        className="px-16"
                                    >
                                        <StyledBadge
                                            badgeContent={formatNumber(
                                                pendingCounts.publicDocuments
                                            )}
                                            invisible={
                                                !pendingCounts.publicDocuments
                                            }
                                            color="default"
                                        >
                                            Documents
                                        </StyledBadge>
                                    </MenuItem>
                                )}
                            </Select>
                        </div>
                        <div className="flex space-x-8">
                            <IconButton
                                onClick={() => {
                                    this.setState({
                                        collapseMobileSearch:
                                            !collapseMobileSearch,
                                    });
                                }}
                                className="h-auto border border-solid border-gray-200 rounded-md shadow-sm px-6 py-6 text-blue-600 font-bold"
                            >
                                <SearchOutlined />
                            </IconButton>

                            {selectedTab !== PendingTab.ACTIONS && (
                                <IconButton
                                    onClick={this.toggleShowCompleted}
                                    className="h-auto border border-solid border-gray-200 rounded-md shadow-sm px-6 py-6 text-blue-600 font-bold"
                                >
                                    {this.props.showCompleted && (
                                        <span className="h-6 w-6 absolute top-5 right-5 bg-ufcwGold rounded-full"></span>
                                    )}
                                    <FilterListOutlined />
                                </IconButton>
                            )}
                            {selectedTab === PendingTab.ACTIONS &&
                                isDesktop() && (
                                    <IconButton
                                        onClick={() => {
                                            this.setState({
                                                showActionFiltersDialog: true,
                                            });
                                        }}
                                        className="h-auto border border-solid border-gray-200 rounded-md shadow-sm px-6 py-6 text-blue-600 font-bold"
                                    >
                                        {this.props.showCompleted && (
                                            <span className="h-6 w-6 absolute top-5 right-5 bg-ufcwGold rounded-full"></span>
                                        )}
                                        <FilterListOutlined />
                                    </IconButton>
                                )}

                            <IconButton
                                onClick={this.fetchDataForTab}
                                className="h-auto border border-solid border-gray-200 rounded-md shadow-sm px-6 py-6 text-blue-600 font-bold"
                            >
                                <RefreshOutlined />
                            </IconButton>
                        </div>
                        {!collapseMobileSearch && (
                            <div className="absolute sm:relative flex sm:block left-0 sm:left-auto right-0 sm:right-auto bg-white w-full sm:w-auto z-50 sm:z-0 px-12 pr-64 sm:px-0">
                                <FormControl
                                    className="w-full"
                                    color="secondary"
                                    size="small"
                                >
                                    <Input
                                        autoFocus={true}
                                        startAdornment={
                                            <SearchOutlined
                                                className="text-ufcwBlue mr-4 lg:mr-12"
                                                // onClick={onSearchEnter}
                                            />
                                        }
                                        endAdornment={
                                            this.state.searchQuery && (
                                                <Icon
                                                    className="fa fa-fw fa-times cursor-pointer"
                                                    onClick={() =>
                                                        this.setState({
                                                            searchQuery: '',
                                                        })
                                                    }
                                                />
                                            )
                                        }
                                        onChange={(e) => {
                                            this.onSearch(e.target.value);
                                        }}
                                        classes={{
                                            root: cx(
                                                css({
                                                    transitionDuration: '0.2s',
                                                    paddingTop: 12,
                                                    paddingBottom: 11,
                                                    // width: collapseMobileSearch ? 32 : 196,
                                                    width: '100%',
                                                    '&:before': {
                                                        borderColor:
                                                            collapseMobileSearch
                                                                ? undefined
                                                                : '#fff',
                                                    },
                                                })
                                            ),
                                            input: css({
                                                // opacity: collapseMobileSearch ? 0 : 1,
                                                paddingTop: 6,
                                                // paddingRight: showMobileSearch ? 72 : 0,
                                                fontSize: 16,
                                            }),
                                            underline: css({
                                                '&:before': {
                                                    borderColor:
                                                        collapseMobileSearch
                                                            ? 'transparent !important'
                                                            : '#fff !important',
                                                },
                                            }),
                                        }}
                                        placeholder={`Search pending ${selectedTab}`}
                                        value={this.state.searchQuery ?? ''}
                                    />
                                </FormControl>
                                <Button
                                    className="block sm:hidden absolute right-0 top-4 p-12 text-blueGray-400 border border-l border-black"
                                    onClick={() => {
                                        this.setState({
                                            collapseMobileSearch:
                                                !collapseMobileSearch,
                                        });
                                    }}
                                >
                                    Hide
                                </Button>
                            </div>
                        )}
                    </div>
                )}
                <div
                    className={cx(
                        'text-xs md:text-sm leading-normal',
                        css({
                            display: 'flex',
                            padding: hideHelp ? '0 24px' : '12px 16px',
                            height: hideHelp ? 0 : 'auto',
                            backgroundColor: '#f0f0f0',
                            transitionDuration: '0.2s',
                            transitionTimingFunction: hideHelp
                                ? 'cubic-bezier(0.4, 0, 0.2, 1)'
                                : 'cubic-bezier(0, 0, 0.2, 1)',
                        })
                    )}
                >
                    {(() => {
                        switch (selectedTab) {
                            case PendingTab.JOINS: {
                                return 'This list includes joins that are pending acceptance, including link-to-join and text-to-joins. A join with a failed workflow will also appear here.';
                            }
                            case PendingTab.EDITS: {
                                return 'This list includes any edits made from the member portal.';
                            }
                            case PendingTab.ACTIONS: {
                                return 'This list includes actions that are waiting to be accepted.';
                            }
                            case PendingTab.DOCUMENTS: {
                                return 'This list includes public document submissions that are waiting to be accepted.';
                            }
                        }
                    })()}
                </div>

                {[PendingTab.EDITS, PendingTab.JOINS].includes(selectedTab) &&
                    showCompleted && (
                        <div className="ag-theme-material flex-1">
                            <AgGridReact
                                onGridReady={(params) => {
                                    this.setState({
                                        gridApi: params.api,
                                    });
                                }}
                                onBodyScroll={this.handleGridScroll}
                                rowModelType="serverSide"
                                columnDefs={[]}
                                rowHeight={
                                    !isSmallerThan('xl')
                                        ? 148
                                        : !isSmallerThan('medium')
                                        ? 256
                                        : 122
                                }
                                headerHeight={0}
                                isFullWidthCell={() => true}
                                fullWidthCellRendererFramework={
                                    !isSmallerThan('xl')
                                        ? (params) => (
                                              <PendingListTemplate
                                                  {...params}
                                                  getCompletedBy={
                                                      this.getCompletedBy
                                                  }
                                                  getCreatedByText={
                                                      this.getCreatedByText
                                                  }
                                                  getIconType={this.getIconType}
                                                  getValidationBtnCls={
                                                      this.getValidationBtnCls
                                                  }
                                                  getValidationText={
                                                      this.getValidationText
                                                  }
                                                  onAcceptClick={
                                                      this.onAcceptClick
                                                  }
                                                  onRejectClick={
                                                      this.onRejectClick
                                                  }
                                                  onViewChangesClick={
                                                      this.onViewChangesClick
                                                  }
                                                  viewApp={this.viewApp}
                                                  onErrorButtonTap={
                                                      this.onErrorButtonTap
                                                  }
                                                  handleOnRowClick={
                                                      this
                                                          .handleCompletedRecordTap
                                                  }
                                                  showTagModal={
                                                      this.showTagModal
                                                  }
                                                  setTags={(tags) =>
                                                      this.setState({
                                                          tags: tags,
                                                      })
                                                  }
                                              />
                                          )
                                        : (params) =>
                                              !isSmallerThan('medium') ? (
                                                  <MobilePendingListTemplate
                                                      {...params}
                                                      getCompletedBy={
                                                          this.getCompletedBy
                                                      }
                                                      getCreatedByText={
                                                          this.getCreatedByText
                                                      }
                                                      getIconType={
                                                          this.getIconType
                                                      }
                                                      getValidationBtnCls={
                                                          this
                                                              .getValidationBtnCls
                                                      }
                                                      getValidationText={
                                                          this.getValidationText
                                                      }
                                                      onAcceptClick={
                                                          this.onAcceptClick
                                                      }
                                                      onRejectClick={
                                                          this.onRejectClick
                                                      }
                                                      onViewChangesClick={
                                                          this
                                                              .onViewChangesClick
                                                      }
                                                      viewApp={this.viewApp}
                                                      onErrorButtonTap={
                                                          this.onErrorButtonTap
                                                      }
                                                  />
                                              ) : (
                                                  <PhonePendingListTemplate
                                                      {...params}
                                                      getCompletedBy={
                                                          this.getCompletedBy
                                                      }
                                                      getCreatedByText={
                                                          this.getCreatedByText
                                                      }
                                                      getIconType={
                                                          this.getIconType
                                                      }
                                                      getValidationBtnCls={
                                                          this
                                                              .getValidationBtnCls
                                                      }
                                                      getValidationText={
                                                          this.getValidationText
                                                      }
                                                      onAcceptClick={
                                                          this.onAcceptClick
                                                      }
                                                      onRejectClick={
                                                          this.onRejectClick
                                                      }
                                                      onViewChangesClick={
                                                          this
                                                              .onViewChangesClick
                                                      }
                                                      viewApp={this.viewApp}
                                                      onErrorButtonTap={
                                                          this.onErrorButtonTap
                                                      }
                                                  />
                                              )
                                }
                                suppressContextMenu
                                //@ts-ignore
                                immutableData
                                getRowNodeId={(data) => data.id}
                                overlayNoRowsTemplate={this.getEmptyText()}
                                enableCellTextSelection
                                // onRowClicked={this.handleCompletedRecordTap}
                                // onCellClicked={this.handleCompletedRecordTap}
                            />
                        </div>
                    )}
                {[PendingTab.EDITS, PendingTab.JOINS].includes(
                    this.state.selectedTab
                ) &&
                    !showCompleted && (
                        <div className="ag-theme-material flex-1">
                            <AgGridReact
                                rowData={this.state.pendingRowData}
                                onBodyScroll={this.handleGridScroll}
                                columnDefs={[]}
                                rowHeight={
                                    !isSmallerThan('xl')
                                        ? 148
                                        : !isSmallerThan('medium')
                                        ? 256
                                        : 122
                                }
                                headerHeight={0}
                                isFullWidthCell={() => true}
                                rowDataChangeDetectionStrategy={
                                    ChangeDetectionStrategyType.DeepValueCheck
                                }
                                fullWidthCellRendererFramework={
                                    !isSmallerThan('xl')
                                        ? (params) => (
                                              <PendingListTemplate
                                                  {...params}
                                                  getCompletedBy={
                                                      this.getCompletedBy
                                                  }
                                                  getCreatedByText={
                                                      this.getCreatedByText
                                                  }
                                                  getIconType={this.getIconType}
                                                  getValidationBtnCls={
                                                      this.getValidationBtnCls
                                                  }
                                                  getValidationText={
                                                      this.getValidationText
                                                  }
                                                  onAcceptClick={
                                                      this.onAcceptClick
                                                  }
                                                  onRejectClick={
                                                      this.onRejectClick
                                                  }
                                                  onViewChangesClick={
                                                      this.onViewChangesClick
                                                  }
                                                  viewApp={this.viewApp}
                                                  onErrorButtonTap={
                                                      this.onErrorButtonTap
                                                  }
                                                  showTagModal={
                                                      this.showTagModal
                                                  }
                                                  setTags={(tags) =>
                                                      this.setState({
                                                          tags: tags,
                                                      })
                                                  }
                                              />
                                          )
                                        : (params) =>
                                              !isSmallerThan('medium') ? (
                                                  <MobilePendingListTemplate
                                                      {...params}
                                                      getCompletedBy={
                                                          this.getCompletedBy
                                                      }
                                                      getCreatedByText={
                                                          this.getCreatedByText
                                                      }
                                                      getIconType={
                                                          this.getIconType
                                                      }
                                                      getValidationBtnCls={
                                                          this
                                                              .getValidationBtnCls
                                                      }
                                                      getValidationText={
                                                          this.getValidationText
                                                      }
                                                      onAcceptClick={
                                                          this.onAcceptClick
                                                      }
                                                      onRejectClick={
                                                          this.onRejectClick
                                                      }
                                                      onViewChangesClick={
                                                          this
                                                              .onViewChangesClick
                                                      }
                                                      viewApp={this.viewApp}
                                                      onErrorButtonTap={
                                                          this.onErrorButtonTap
                                                      }
                                                  />
                                              ) : (
                                                  <PhonePendingListTemplate
                                                      {...params}
                                                      getCompletedBy={
                                                          this.getCompletedBy
                                                      }
                                                      getCreatedByText={
                                                          this.getCreatedByText
                                                      }
                                                      getIconType={
                                                          this.getIconType
                                                      }
                                                      getValidationBtnCls={
                                                          this
                                                              .getValidationBtnCls
                                                      }
                                                      getValidationText={
                                                          this.getValidationText
                                                      }
                                                      onAcceptClick={
                                                          this.onAcceptClick
                                                      }
                                                      onRejectClick={
                                                          this.onRejectClick
                                                      }
                                                      onViewChangesClick={
                                                          this
                                                              .onViewChangesClick
                                                      }
                                                      viewApp={this.viewApp}
                                                      onErrorButtonTap={
                                                          this.onErrorButtonTap
                                                      }
                                                  />
                                              )
                                }
                                suppressContextMenu
                                immutableData
                                enableCellTextSelection
                                getRowNodeId={(data) => data.id}
                                overlayNoRowsTemplate={this.getEmptyText()}
                                onFirstDataRendered={(e) => {
                                    e.api.ensureNodeVisible((node) => {
                                        return (
                                            node.data.id.toString() ===
                                            this.props.match.params.recordId
                                        );
                                    }, 'middle');
                                }}
                            />
                        </div>
                    )}
                {this.state.selectedTab === PendingTab.ACTIONS && (
                    <div className="ag-theme-material flex-1">
                        <ActionList
                            onGridScroll={this.handleGridScroll}
                            searchQuery={this.state.searchQuery}
                            areFiltersOpen={showActionFiltersDialog}
                            onFilterClose={() => {
                                this.setState({
                                    showActionFiltersDialog: false,
                                });
                            }}
                        />
                    </div>
                )}
                {this.state.selectedTab === PendingTab.DOCUMENTS && (
                    <PublicDocumentsList
                        showCompleted={this.props.showCompleted}
                        searchQuery={this.state.searchQuery}
                    />
                )}
                {this.state.showMemberModal && (
                    <PendingMemberDialog
                        validationRecord={this.state.selectedValidationRecord}
                        pendingRecord={selectedPendingRecord}
                        filterEmployee={() => {
                            this.setState({
                                searchQuery: selectedPendingRecord.ssn,
                                showMemberModal: false,
                            });
                        }}
                        hide={() => this.toggleMemberModal(null, null)}
                        onViewChanges={() => {
                            this.setState({
                                showMemberModal: false,
                                showChangesModal: true,
                            });
                        }}
                        showMatchModal={this.showMatchModal}
                    />
                )}
                {this.state.showChangesModal && (
                    <ViewChangesDialog
                        hide={this.hideShowChangesModal}
                        record={this.state.selectedPendingRecord}
                    />
                )}
                {this.state.showTagModal && (
                    <SDialog
                        fullWidth
                        open={this.state.showTagModal}
                        onClose={() => this.hideTagModal()}
                        title={`Add Tags (${selectedPendingRecord.memberBlob.Root.firstName} ${selectedPendingRecord.memberBlob.Root.lastName})`}
                    >
                        <DialogContent>
                            <div
                                className={css({
                                    margin: '12px 0 0 0',
                                    '& label': {
                                        color: 'rgba(0, 0, 0, 0.7)',
                                        display: 'block',
                                        marginBottom: 8,
                                    },
                                })}
                            >
                                <label>
                                    The following tags will be added to the
                                    selected members' existing tags
                                </label>
                                <Tags
                                    minQueryLength={0}
                                    tags={this.state.tags}
                                    // suggestions={tagSuggestions}
                                    allowNew={true}
                                    onAddition={this.handleTagAddition}
                                    onDelete={this.handleTagDelete}
                                    placeholderText="Add a new tag..."
                                    addOnBlur
                                />
                            </div>
                            <div className="my-16 flex justify-end">
                                <Button
                                    variant="outlined"
                                    disabled={this.tagsUpdateDisabled()}
                                    onClick={() => {
                                        this.handleStagingRecordUpdate();
                                    }}
                                >
                                    Save
                                </Button>
                            </div>
                        </DialogContent>
                    </SDialog>
                )}
                {this.state.showMatchModal && (
                    <MatchPotentialMemberDialog
                        open={!!this.state.selectedPendingRecord}
                        stagingRecord={this.state.selectedPendingRecord}
                        stagingValidationRecord={
                            this.state.selectedValidationRecord
                        }
                        onClose={this.hideMatchModal}
                        onAcceptMatch={this.onAcceptMatch}
                        onReject={this.onRejectClick}
                    />
                )}
            </LoadingWrapper>
        );
    }

    clearSearch(): void {
        this.setState({ searchQuery: '' });
    }

    lookupNameFromUserId = (userId) => {
        const { agents, applicationUsers } = this.props;

        const all = agents
            .map((agent) => ({
                userId: agent.number.toString(),
                firstName: agent.firstName,
                lastName: agent.lastName,
            }))
            .concat(
                applicationUsers.map((user) => ({
                    userId: user.shortId,
                    firstName: user.firstName,
                    lastName: user.lastName,
                }))
            );
        const found = all.find((user) => user.userId === userId);

        return found ? `${found.firstName} ${found.lastName}` : userId;
    };

    getEmptyText = (): string => {
        const { selectedTab } = this.state;
        const label =
            selectedTab === PendingTab.EDITS
                ? 'edit records'
                : selectedTab === PendingTab.JOINS
                ? 'join records'
                : 'actions';
        return `No pending ${label}`;
    };
}

export default connect<StateProps, DispatchProps, PassedProps>(
    stateToProps,
    dispatchToProps
)((props) => {
    const pendingRoute = useRouteMatch('/pending/:pendingType/:recordId?');

    const { data: pendingCounts } = usePendingCounts({
        options: {
            placeholderData: {
                actionCounts: 0,
                joinsCount: 0,
                editsCount: 0,
                publicDocumentCount: 0,
                stagingRecordsCount: 0,
            },
            select: (counts) => ({
                actions: counts.actionCounts,
                edits: counts.editsCount,
                joins: counts.joinsCount,
                publicDocuments: counts.publicDocumentCount,
                stagingRecordsCount: 0,
            }),
        },
    });

    if (pendingRoute === null) {
        return <Redirect to="/pending/joins" />;
    }

    return <PendingList {...(props as any)} pendingCounts={pendingCounts} />;
});

const PendingListTemplate = ({
    data,
    getCompletedBy,
    getCreatedByText,
    getIconType,
    getValidationBtnCls,
    getValidationText,
    onAcceptClick,
    onRejectClick,
    onViewChangesClick,
    viewApp,
    onErrorButtonTap,
    handleOnRowClick,
    showTagModal,
    setTags,
}) => {
    const record: Models.MemberStagingRecord | undefined = data;
    const anchorRef = React.useRef();
    const [showPop, setPop] = React.useState(false);
    const member = record?.memberBlob.Root;
    const tags = !member['skfTags']
        ? ([] as { id: string; name: string }[])
        : _.isArray(member['skfTags'])
        ? member['skfTags'].map((t) => ({ id: t, name: t }))
        : [member['skfTags']].map((t) => ({ id: t, name: t }));

    const dispatch = useDispatch();
    const routeMatch = useRouteMatch<{
        page: string;
        recordId?: string;
    }>('/pending/:page/:recordId?');

    const isHighlighted = routeMatch
        ? parseInt(routeMatch.params.recordId) === record?.id
        : false;

    const dropdownEmployers = useSelector<RootState, Employer[]>(
        (state) => state.Employer.dropdownEmployers
    );

    const pendingValidationRecords = useSelector<
        RootState,
        Models.StagingValidationRecord[]
    >((state) => state.Employer.pendingValidationRecords);

    const isLoadingValidation = useSelector<RootState, boolean>(
        (state) => state.Employer.loadingPendingValidation
    );

    const employer = dropdownEmployers?.find(
        (emp) => emp.employerNumber === member?.employerId
    );

    const validationRecord = pendingValidationRecords.find(
        (r) => r.memberStagingRecordId === record?.id
    );

    const isCompleted = Boolean(record?.dateAccepted || record?.dateRejected);

    const showCompareButton =
        validationRecord &&
        validationRecord.validationCodes.some((code) => {
            return [
                StagingValidationType.Match,
                StagingValidationType.Conflict,
                StagingValidationType.DuplicatePending,
                StagingValidationType.PotentialMatches,
            ].includes(code);
        });

    const showAcceptButton = !validationRecord?.validationCodes.includes(
        StagingValidationType.XRefConflict
    );

    const selectEmployee = useCallback(
        (ssn) => dispatch(EmployerActions.SelectEmployeeByID(ssn)),
        [dispatch]
    );

    if (!record) {
        return <div />;
    }

    const popoverClose = (e: Event) => {
        e.stopPropagation();
        setPop(false);
    };

    return (
        <div
            className={cx(
                'flex items-center w-full',
                isHighlighted && 'bg-ogblue-200',
                css({
                    height: 148,
                    padding: '12px 24px',
                })
            )}
            onClick={null}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    marginRight: '32px',
                }}
            >
                <div
                    className={cx(
                        'fa fa-fw pending-icon',
                        css({
                            fontSize: '2.5em',
                            color: 'rgba(0, 0, 0, 0.7)',
                            // marginRight: 32,
                        }),
                        getIconType(record, validationRecord)
                    )}
                />

                <IconButton
                    className={cx(
                        'hover:text-ufcwGold',
                        showPop ? 'text-ufcwGold' : ''
                    )}
                    ref={anchorRef}
                    onClick={(e) => {
                        e.stopPropagation();
                        setPop(!showPop);
                    }}
                >
                    <MoreVert />
                </IconButton>
            </div>

            <div className="flex flex-col justify-center flex-1">
                <div className="desktop-employer-name">
                    {' '}
                    {member.firstName} {member.lastName}{' '}
                </div>
                <div>
                    <span>SSN: {member.ssn}</span>
                </div>
                <div>Added By: {getCreatedByText(record)}</div>
                {isCompleted && getCompletedBy(record)}
                <div style={{ display: 'flex', gap: 4 }}>
                    {record.isRejoin ? (
                        <>
                            <button
                                className="secondary small mt-8 flex justify-center items-center"
                                style={{ width: '120px' }}
                                onClick={() => {
                                    viewApp(record);
                                }}
                            >
                                <span className=" mr-8" />
                                View Application
                            </button>
                            <button
                                className="secondary small mt-8 flex justify-center items-center"
                                style={{ width: '100px' }}
                                onClick={() => selectEmployee(member.ssn)}
                            >
                                <div className=" mr-8" />
                                View Member
                            </button>
                        </>
                    ) : (
                        <button
                            className="secondary small mt-8 flex justify-center items-center"
                            onClick={() => selectEmployee(member.ssn)}
                            style={{ width: '100px' }}
                        >
                            <div className=" mr-8" />
                            View Member
                        </button>
                    )}

                    {/* <IconButton
                        className={cx(
                            'hover:text-ufcwGold',
                            showPop ? 'text-ufcwGold' : ''
                        )}
                        ref={anchorRef}
                        onClick={(e) => {
                            e.stopPropagation();
                            setPop(!showPop);
                        }}
                    >
                        <MoreVert />
                    </IconButton> */}
                    <Popover
                        open={showPop}
                        anchorEl={anchorRef.current}
                        onClose={(e, reason) => {
                            popoverClose(e as Event);
                        }}
                        anchorOrigin={{
                            vertical: 'center',
                            horizontal: 'right',
                        }}
                        transformOrigin={{
                            vertical: 'center',
                            horizontal: 'left',
                        }}
                    >
                        <MenuItem
                            className="text-xs text-blue-700 font-semibold"
                            onClick={(e) => {
                                e.stopPropagation();
                                setTags(tags);
                                showTagModal(record);
                                setPop(!showPop);
                            }}
                        >
                            <AddCircleOutlineOutlined className="text-sm mr-6 text-blue-700" />
                            Add Tag
                        </MenuItem>
                    </Popover>
                </div>
            </div>

            <div className="flex-1 w-full">
                <div className="mb-10">
                    {tags?.map((t) => (
                        <span
                            key={t.id}
                            className={cx(
                                css({
                                    lineHeight: '1em',
                                    margin: 2,
                                    padding: 4,
                                    fontSize: 10,
                                    borderRadius: 4,
                                    color: '#fff',
                                    fontWeight: 600,
                                }),
                                css({
                                    background: stringToColor(t.name ?? ''),
                                })
                            )}
                        >
                            {t.name}
                        </span>
                    ))}
                </div>
                <div className="flex justify-evenly">
                    <div className="flex flex-col flex-1 overflow-hidden">
                        <div>
                            <span className="fa fa-phone uniform-width"> </span>
                            <span className="indent">
                                Home Phone: {formatPhoneNumber(member.phoneNum)}
                            </span>
                        </div>
                        <div className="mt-4">
                            <span className="fa fa-mobile uniform-width">
                                {' '}
                            </span>
                            <span className="indent">
                                Cell Phone:{' '}
                                {formatPhoneNumber(member.cellPhone)}
                            </span>
                        </div>
                        <div className="mt-4">
                            <span className="fa fa-calendar uniform-width">
                                {' '}
                            </span>
                            <span className="indent">
                                Hire Date: {formatHireDate(member.origHireDate)}
                            </span>
                        </div>
                        <div className="mt-4 truncate">
                            <span className="fa fa-envelope-o uniform-width">
                                {' '}
                            </span>
                            <span className="indent">
                                Email: {member.email}
                            </span>
                        </div>
                    </div>
                    {employer && (
                        <div className="flex flex-col flex-1 overflow-hidden">
                            <div>
                                <span className="fa fa-clock-o uniform-width" />
                                <span className="indent">
                                    Request Date:{' '}
                                    {format(
                                        fromUTC(record.dateUpdated),
                                        'MM/dd/yyyy'
                                    )}
                                </span>
                            </div>
                            <div className="mt-4">
                                <div>
                                    <span className="fa fa-building-o uniform-width" />
                                    <span className="indent">
                                        Employer ID: {employer.employerNumber}
                                    </span>
                                </div>
                                <div className="lighter-font">
                                    <span className="fa fa-placeholder uniform-width" />
                                    <span className="indent">
                                        {employer.name}
                                    </span>
                                </div>
                                <div className="lighter-font truncate">
                                    {employer.address1.length > 0 && (
                                        <span>
                                            <span className="fa fa-placeholder uniform-width" />
                                            <span className="indent">
                                                {employer.address1}
                                            </span>
                                        </span>
                                    )}
                                    {employer.address2.length > 0 &&
                                        isDesktop() && (
                                            <span>
                                                <span className="fa fa-placeholder uniform-width" />
                                                <span className="indent">
                                                    {employer.address2}
                                                </span>
                                            </span>
                                        )}
                                </div>
                                <div className="lighter-font">
                                    <span className="fa fa-placeholder uniform-width" />
                                    <span className="indent">
                                        {employer.city}, {employer.state}{' '}
                                        {employer.zipCode}
                                    </span>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col justify-center flex-1">
                {isLoadingValidation ? (
                    <div className="flex flex-col items-center">
                        <div style={{ fontWeight: 'bold' }}>Validating</div>
                        <div className="fa fa-spinner fa-spin fa-2x fa-fw" />
                    </div>
                ) : (
                    <div
                        className="flex justify-end mr-16"
                        onClick={(e) => e.stopPropagation()}
                    >
                        {validationRecord &&
                            validationRecord.validationCodes.length > 0 && (
                                <button
                                    className="secondary"
                                    onClick={() =>
                                        onErrorButtonTap(
                                            record,
                                            validationRecord
                                        )
                                    }
                                >
                                    <div
                                        className={cx(
                                            'fa fa-fw mr-8',
                                            getValidationBtnCls(
                                                validationRecord
                                            )
                                        )}
                                    />
                                    {getValidationText(validationRecord)}
                                </button>
                            )}
                    </div>
                )}
            </div>
            {!isCompleted ? (
                <div
                    className={cx(
                        'flex flex-col justify-center ml-8',
                        css({
                            height: '100%',
                            width: 192,
                        })
                    )}
                    onClick={(e) => e.stopPropagation()}
                >
                    {showAcceptButton && (
                        <button
                            className="green mt-4"
                            onClick={() =>
                                onAcceptClick(record, validationRecord)
                            }
                        >
                            <div className="fa fa-fw fa-lg fa-check mr-8" />
                            Accept
                        </button>
                    )}
                    <button
                        className="gray mt-4"
                        onClick={() => onRejectClick(record)}
                    >
                        <div className="fa fa-fw fa-lg fa-ban mr-8" />
                        Reject
                    </button>
                    {showCompareButton && (
                        <button
                            className="secondary mt-4"
                            onClick={(e) => {
                                e.preventDefault();
                                onViewChangesClick(record);
                            }}
                        >
                            <div className="fa fa-fw fa-lg fa-search mr-8" />
                            View Changes
                        </button>
                    )}
                </div>
            ) : (
                <div className="fa fa-chevron-right select-chevron" />
            )}
        </div>
    );
};

const MobilePendingListTemplate = ({
    data,
    getCompletedBy,
    getCreatedByText,
    getIconType,
    getValidationBtnCls,
    getValidationText,
    onAcceptClick,
    onRejectClick,
    onViewChangesClick,
    viewApp,
    onErrorButtonTap,
}) => {
    const record: Models.MemberStagingRecord | undefined = data;

    const member = record?.memberBlob.Root;

    const dispatch = useDispatch();
    const routeMatch = useRouteMatch<{
        page: string;
        recordId?: string;
    }>('/pending/:page/:recordId?');

    const isHighlighted = routeMatch
        ? parseInt(routeMatch.params.recordId) === record?.id
        : false;

    const dropdownEmployers = useSelector<RootState, Employer[]>(
        (state) => state.Employer.dropdownEmployers
    );

    const pendingValidationRecords = useSelector<
        RootState,
        Models.StagingValidationRecord[]
    >((state) => state.Employer.pendingValidationRecords);

    const isLoadingValidation = useSelector<RootState, boolean>(
        (state) => state.Employer.loadingPendingValidation
    );

    const employer = dropdownEmployers?.find(
        (emp) => emp.employerNumber === member?.employerId
    );

    const validationRecord = pendingValidationRecords.find(
        (r) => r.memberStagingRecordId === record?.id
    );

    const isCompleted = Boolean(record?.dateAccepted || record?.dateRejected);

    const showCompareButton =
        validationRecord &&
        validationRecord.validationCodes.some((code) => {
            return [
                StagingValidationType.Match,
                StagingValidationType.Conflict,
                StagingValidationType.DuplicatePending,
                StagingValidationType.PotentialMatches,
            ].includes(code);
        });
    // console.log('Validation Record for Member:', validationRecord);
    // console.log(
    //     'Validation Codes for Members:wfwefewfewf',
    //     validationRecord?.validationCodes
    // );
    const showAcceptButton = !validationRecord?.validationCodes.includes(
        StagingValidationType.XRefConflict
    );

    const selectEmployee = useCallback(
        (ssn) => dispatch(EmployerActions.SelectEmployeeByID(ssn)),
        [dispatch]
    );

    if (!record) {
        return <div />;
    }

    return (
        <div
            className={cx(
                'flex justify-between',
                isHighlighted && 'bg-ogblue-200',
                css({
                    padding: 16,
                    height: 272,
                    color: 'rgba(0, 0, 0, 0.8)',
                })
            )}
        >
            <div
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    overflow: 'visible',
                }}
            >
                <div
                    className={cx(
                        'flex justify-between',
                        css({
                            color: 'rgba(0, 0, 0, 0.8)',
                        })
                    )}
                >
                    <h2
                        style={{
                            margin: 0,
                        }}
                    >
                        <span
                            className={
                                'fa fa-fw ' +
                                getIconType(record, validationRecord)
                            }
                        />
                        <span
                            style={{
                                margin: '0 8px',
                            }}
                        >
                            {member.firstName} {member.lastName}
                        </span>
                    </h2>
                </div>
                <div
                    className={css({
                        padding: '0 0 0 36px',
                    })}
                >
                    <div>{isCompleted && getCompletedBy(record)}</div>
                    <div className="flex">
                        <div className="flex flex-col">
                            <ListItem>
                                <span style={{ fontWeight: 600 }}>SSN:</span>{' '}
                                {member.ssn}
                            </ListItem>
                            <ListItem>
                                <span>
                                    <span style={{ fontWeight: 600 }}>
                                        Home:
                                    </span>{' '}
                                    {formatPhoneNumber(member.phoneNum)}
                                </span>
                            </ListItem>
                        </div>
                        <div className="flex flex-col">
                            <ListItem>
                                <span>
                                    <span style={{ fontWeight: 600 }}>
                                        Request Date:
                                    </span>{' '}
                                    {format(
                                        fromUTC(record.dateUpdated),
                                        'MM/dd/yyyy'
                                    )}
                                </span>
                            </ListItem>
                            <ListItem>
                                <span>
                                    <span style={{ fontWeight: 600 }}>
                                        Cell:
                                    </span>{' '}
                                    {formatPhoneNumber(member.cellPhone)}
                                </span>
                            </ListItem>
                        </div>
                        <div className="flex flex-col">
                            <ListItem>
                                <span>
                                    <span style={{ fontWeight: 600 }}>
                                        Hire Date:
                                    </span>{' '}
                                    {formatHireDate(member.origHireDate)}
                                </span>
                            </ListItem>
                        </div>
                    </div>

                    <div className="flex">
                        <ListItem>
                            <span style={{ fontWeight: 600 }}>Added By:</span>{' '}
                            {getCreatedByText(record)}
                        </ListItem>
                    </div>
                    <div>
                        {employer && (
                            <ListItem>
                                <div>
                                    <span>
                                        <span style={{ fontWeight: 600 }}>
                                            Employer ID:
                                        </span>{' '}
                                        {employer.employerNumber}
                                    </span>
                                </div>
                                <div className="lighter-font">
                                    <span>{employer.name}</span>
                                </div>
                                <div>
                                    {employer.address1.length > 0 && (
                                        <span>
                                            <span>{employer.address1}</span>
                                        </span>
                                    )}
                                    {employer.address2.length > 0 &&
                                        isDesktop() && (
                                            <span>
                                                <span>{employer.address2}</span>
                                            </span>
                                        )}
                                </div>
                                <div className="lighter-font">
                                    <span>
                                        {employer.city}, {employer.state}{' '}
                                        {employer.zipCode}
                                    </span>
                                </div>
                            </ListItem>
                        )}
                    </div>
                    {!isCompleted && (
                        <div className="flex mt-16">
                            {showAcceptButton && (
                                <button
                                    className="green mr-8"
                                    onClick={() =>
                                        onAcceptClick(record, validationRecord)
                                    }
                                >
                                    <div className="fa fa-fw fa-lg fa-check mr-8" />
                                    Accept
                                </button>
                            )}
                            <button
                                className="gray mr-8"
                                onClick={() => onRejectClick(record)}
                            >
                                <div className="fa fa-fw fa-lg fa-ban mr-8" />
                                Reject
                            </button>
                            {showCompareButton && (
                                <button
                                    className="secondary"
                                    onClick={() => onViewChangesClick(record)}
                                >
                                    <div className="fa fa-fw fa-lg fa-search mr-8" />
                                    View Changes
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>
            <div className="flex flex-col">
                {record.isRejoin ? (
                    <div style={{ display: 'flex', gap: 4 }}>
                        <button
                            className="primary small pill"
                            style={{ filter: 'grayscale(1)' }}
                            onClick={() => {
                                viewApp(record);
                            }}
                        >
                            <span className="fa fa-file-pdf-o mr-8" />
                            PDF
                        </button>
                        <button
                            className="primary small pill"
                            onClick={() => {
                                selectEmployee(member.ssn);
                            }}
                        >
                            <div className="fa fa-user mr-8" />
                            View Member
                        </button>
                    </div>
                ) : (
                    <button
                        className="primary small pill"
                        style={{ filter: 'grayscale(1)' }}
                        onClick={() => {
                            viewApp(record);
                        }}
                    >
                        <span className="fa fa-file-pdf-o mr-8" />
                        PDF
                    </button>
                )}
                {isLoadingValidation ? (
                    <div className="flex mt-8 justify-center">
                        Validating:{' '}
                        <span className="fa fa-fw fa-spinner fa-spin"></span>
                    </div>
                ) : (
                    validationRecord &&
                    validationRecord.validationCodes.length > 0 && (
                        <button
                            className="small pill secondary mt-8"
                            onClick={() =>
                                onErrorButtonTap(record, validationRecord)
                            }
                        >
                            <span
                                className={cx(
                                    'fa mr-8',
                                    getValidationBtnCls(validationRecord)
                                )}
                            />
                            {getValidationText(validationRecord)}
                        </button>
                    )
                )}
            </div>
        </div>
    );
};

const PhonePendingListTemplate = ({
    data,
    getCreatedByText,
    getValidationText,
    onAcceptClick,
    onRejectClick,
    onViewChangesClick,
    viewApp,
    onErrorButtonTap,
}) => {
    const record: Models.MemberStagingRecord | undefined = data;

    const member = record?.memberBlob.Root;

    const dispatch = useDispatch();
    const routeMatch = useRouteMatch<{
        page: string;
        recordId?: string;
    }>('/pending/:page/:recordId?');

    const isHighlighted = routeMatch
        ? parseInt(routeMatch.params.recordId) === record?.id
        : false;

    const dropdownEmployers = useSelector<RootState, Employer[]>(
        (state) => state.Employer.dropdownEmployers
    );

    const pendingValidationRecords = useSelector<
        RootState,
        Models.StagingValidationRecord[]
    >((state) => state.Employer.pendingValidationRecords);

    const isLoadingValidation = useSelector<RootState, boolean>(
        (state) => state.Employer.loadingPendingValidation
    );

    const employer = dropdownEmployers?.find(
        (emp) => emp.employerNumber === member?.employerId
    );

    const validationRecord = pendingValidationRecords.find(
        (r) => r.memberStagingRecordId === record?.id
    );

    const isCompleted = Boolean(record?.dateAccepted || record?.dateRejected);

    const showCompareButton =
        validationRecord &&
        validationRecord.validationCodes.some((code) => {
            return [
                StagingValidationType.Match,
                StagingValidationType.Conflict,
                StagingValidationType.DuplicatePending,
            ].includes(code);
        });

    const showAcceptButton = !validationRecord?.validationCodes.includes(
        StagingValidationType.XRefConflict
    );

    const selectEmployee = useCallback(
        (ssn) => dispatch(EmployerActions.SelectEmployeeByID(ssn)),
        [dispatch]
    );

    if (!record) {
        return <div />;
    }

    const getValidationBtnCls = (
        validationRecord: Models.StagingValidationRecord
    ): any => {
        if (validationRecord.validationCodes.length <= 1) {
            switch (validationRecord.validationCodes[0]) {
                case StagingValidationType.Conflict:
                    return 'fa fa-warning';
                case StagingValidationType.Match:
                    return 'fa fa-check';
                case StagingValidationType.DuplicatePending:
                    return 'fa fa-warning';
                case StagingValidationType.WorkflowError:
                    return 'fa fa-warning';
                case StagingValidationType.Deleted:
                    return 'fa fa-warning';
                case StagingValidationType.XRefConflict:
                    return 'fa fa-warning';
                default:
                    return '';
            }
        } else {
            return 'fa fa-warning';
        }
    };

    return (
        <div
            className={cx(
                'flex justify-between',
                isHighlighted && 'bg-ogblue-200',
                css({
                    padding: 16,
                    height: 122,
                    color: 'rgba(0, 0, 0, 0.8)',
                })
            )}
        >
            <div className="flex flex-col w-full overflow-visible">
                <div className="flex flex-col w-full leading-snug">
                    <h2 className="m-0 p-0 text-base">
                        {member.lastName}, {member.firstName}
                    </h2>
                    <div className="absolute top-12 right-12">
                        <DropdownIconButton
                            className="absolute top-12 right-12"
                            icon={<MoreVertOutlined />}
                            render={({ onClose }) => (
                                <div className="-mt-12 -mb-12 border border-solid border-blue-600 rounded-md w-186">
                                    {!isCompleted && (
                                        <div className="flex flex-col">
                                            {showCompareButton && (
                                                <MenuItem
                                                    className="border-b border-solid border-gray-200 px-8 text-left text-blue-600 text-md"
                                                    onClick={() => {
                                                        onClose();
                                                        onViewChangesClick(
                                                            record
                                                        );
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <SearchOutlined className="text-blue-600" />
                                                    </ListItemIcon>
                                                    View Changes
                                                </MenuItem>
                                            )}
                                            {showAcceptButton && (
                                                <MenuItem
                                                    className="border-b border-solid border-gray-200 px-8 text-left text-green-600 text-md"
                                                    onClick={() => {
                                                        onClose();
                                                        onAcceptClick(
                                                            record,
                                                            validationRecord
                                                        );
                                                    }}
                                                >
                                                    <ListItemIcon>
                                                        <CheckOutlined className="text-green-600" />
                                                    </ListItemIcon>
                                                    Accept
                                                </MenuItem>
                                            )}
                                            <MenuItem
                                                className="px-8 text-left text-red-600 text-md"
                                                onClick={() => {
                                                    onClose();
                                                    onRejectClick(record);
                                                }}
                                            >
                                                <ListItemIcon>
                                                    <BlockOutlined className="text-red-600" />
                                                </ListItemIcon>
                                                Reject
                                            </MenuItem>
                                        </div>
                                    )}
                                </div>
                            )}
                        />
                    </div>
                    {employer && (
                        <p className="text-gray-600 text-sm m-0 p-0">
                            {employer.name}
                        </p>
                    )}
                    <p className="text-gray-600 text-xs m-0 p-0">
                        Added on{' '}
                        {format(fromUTC(record.dateUpdated), 'MM/dd/yyyy')} by{' '}
                        {getCreatedByText(record)}
                    </p>
                    <div
                        className={`flex items-center w-full pt-6 ${
                            isLoadingValidation ||
                            validationRecord?.validationCodes.length > 0
                                ? 'justify-between'
                                : 'justify-end'
                        }`}
                    >
                        {isLoadingValidation ? (
                            <div className="flex mt-8 justify-center">
                                Validating:{' '}
                                <span className="fa fa-fw fa-spinner fa-spin"></span>
                            </div>
                        ) : (
                            validationRecord &&
                            validationRecord.validationCodes.length > 0 && (
                                <button
                                    className="uppercase text-xs font-medium text-left p-0"
                                    onClick={() =>
                                        onErrorButtonTap(
                                            record,
                                            validationRecord
                                        )
                                    }
                                >
                                    <span
                                        className={cx(
                                            'fa mr-4 text-blue-500',
                                            getValidationBtnCls(
                                                validationRecord
                                            )
                                        )}
                                    />
                                    {getValidationText(validationRecord)}
                                </button>
                            )
                        )}
                        {record.isRejoin ? (
                            <button
                                className="w-auto px-6 text-blue-600 text-xs py-4 border-solid border-gray-100 text-right flex items-center justify-center font-medium tracking-normal"
                                onClick={() => {
                                    selectEmployee(member.ssn);
                                }}
                            >
                                <AccountCircleOutlined className="text-blue-600 h-16 w-16 mr-4" />
                                View Member
                            </button>
                        ) : (
                            <button
                                className="primary small pill"
                                style={{ filter: 'grayscale(1)' }}
                                onClick={() => {
                                    viewApp(record);
                                }}
                            >
                                <span className="fa fa-file-pdf-o mr-8" />
                                PDF
                            </button>
                        )}
                    </div>
                </div>
                <div
                    className={css({
                        padding: '0 0 0 36px',
                    })}
                ></div>
            </div>
        </div>
    );
};
