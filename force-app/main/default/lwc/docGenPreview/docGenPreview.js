import { LightningElement, api, track } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import { NavigationMixin } from 'lightning/navigation';
import getDGPStatus from '@salesforce/apex/DocGenPreviewController.getDGPStatus';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS     = 60;

export default class DocGenPreview extends NavigationMixin(LightningElement) {

    // ─── Flow Inputs ────────────────────────────────────────────────────────
    @api dgpId;
    @api cardTitle        = 'Generated Document';
    @api autoPreview      = false;
    @api hidePdfDownload  = false;
    @api showDocxDownload = false;

    // ─── Flow Outputs ────────────────────────────────────────────────────────
    @api contentVersionId;
    @api contentDocumentId;

    // ─── Internal State ─────────────────────────────────────────────────────
    @track isLoading  = true;
    @track isComplete = false;
    @track isError    = false;
    @track isTimedOut = false;
    @track errorMessage   = '';
    @track elapsedSeconds = 0;

    pdfContentVersionId  = null;
    docContentVersionId  = null;
    pdfContentDocumentId = null;

    _pollInterval  = null;
    _elapsedTicker = null;
    _attemptCount  = 0;

    // ─── Lifecycle ──────────────────────────────────────────────────────────

    connectedCallback() {
        if (!this.dgpId) {
            this.showError('No Document Generation Process ID was provided.');
            return;
        }
        this.startPolling();
        this.startElapsedTicker();
    }

    disconnectedCallback() {
        this.stopPolling();
        this.stopElapsedTicker();
    }

    // ─── Polling ────────────────────────────────────────────────────────────

    startPolling() {
        this.pollStatus();
        this._pollInterval = setInterval(() => this.pollStatus(), POLL_INTERVAL_MS);
    }

    stopPolling() {
        if (this._pollInterval) {
            clearInterval(this._pollInterval);
            this._pollInterval = null;
        }
    }

    async pollStatus() {
        this._attemptCount++;

        if (this._attemptCount > MAX_ATTEMPTS) {
            this.stopPolling();
            this.stopElapsedTicker();
            this.isLoading  = false;
            this.isTimedOut = true;
            return;
        }

        try {
            const result = await getDGPStatus({ dgpId: this.dgpId });

            if (result.status === 'Success') {
                this.stopPolling();
                this.stopElapsedTicker();

                this.pdfContentVersionId  = result.pdfContentVersionId;
                this.docContentVersionId  = result.docContentVersionId;
                this.pdfContentDocumentId = result.pdfContentDocumentId;

                const outputId = result.pdfContentVersionId || result.docContentVersionId;
                if (outputId) {
                    this.dispatchEvent(new FlowAttributeChangeEvent('contentVersionId', outputId));
                }
                if (this.pdfContentDocumentId) {
                    this.dispatchEvent(new FlowAttributeChangeEvent('contentDocumentId', this.pdfContentDocumentId));
                }

                this.isLoading  = false;
                this.isComplete = true;

                if (this.autoPreview) {
                    this.handlePreview();
                }

            } else if (result.status === 'Failure') {
                this.stopPolling();
                this.stopElapsedTicker();
                this.showError(result.errorMessage);
            }

        } catch (error) {
            console.error('DocGenPreview poll error:', error);
        }
    }

    // ─── Elapsed Timer ──────────────────────────────────────────────────────

    startElapsedTicker() {
        this._elapsedTicker = setInterval(() => this.elapsedSeconds++, 1000);
    }

    stopElapsedTicker() {
        if (this._elapsedTicker) {
            clearInterval(this._elapsedTicker);
            this._elapsedTicker = null;
        }
    }

    // ─── Handlers ───────────────────────────────────────────────────────────

    handlePreview() {
        const previewId = this.pdfContentDocumentId || this.pdfContentVersionId;
        this[NavigationMixin.Navigate]({
            type: 'standard__namedPage',
            attributes: { pageName: 'filePreview' },
            state: { selectedRecordId: previewId }
        });
    }

    handlePdfDownload() {
        window.open(this.pdfDownloadUrl, '_blank');
    }

    handleDocxDownload() {
        window.open(this.docxDownloadUrl, '_blank');
    }

    handleRetry() {
        this.isError        = false;
        this.isTimedOut     = false;
        this.isLoading      = true;
        this._attemptCount  = 0;
        this.elapsedSeconds = 0;
        this.startPolling();
        this.startElapsedTicker();
    }

    handleCheckAgain() {
        this.isTimedOut    = false;
        this.isLoading     = true;
        this._attemptCount = 0;
        this.startPolling();
        this.startElapsedTicker();
    }

    // ─── Helpers ────────────────────────────────────────────────────────────

    showError(message) {
        this.stopPolling();
        this.stopElapsedTicker();
        this.isLoading    = false;
        this.isError      = true;
        this.errorMessage = message || 'An unexpected error occurred.';
    }

    // ─── Computed Properties ────────────────────────────────────────────────

    get showPreviewButton() {
        return this.isComplete && this.pdfContentDocumentId;
    }

    get showPdfDownload() {
        return this.isComplete && !this.hidePdfDownload && this.pdfContentVersionId;
    }

    get showDocxDownloadBtn() {
        return this.isComplete && this.showDocxDownload && this.docContentVersionId;
    }

    get pdfDownloadUrl() {
        if (!this.pdfContentVersionId) return null;
        return `/sfc/servlet.shepherd/version/download/${this.pdfContentVersionId}?operationContext=S1`;
    }

    get docxDownloadUrl() {
        if (!this.docContentVersionId) return null;
        return `/sfc/servlet.shepherd/version/download/${this.docContentVersionId}?operationContext=S1`;
    }
}
