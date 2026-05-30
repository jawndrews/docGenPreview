import { LightningElement, api, track } from 'lwc';
import { FlowAttributeChangeEvent } from 'lightning/flowSupport';
import getDGPStatus from '@salesforce/apex/DocGenPreviewController.getDGPStatus';

const POLL_INTERVAL_MS = 3000;
const MAX_ATTEMPTS     = 60;   // 60 × 3s = ~3 minutes before timing out

/**
 * docGenPreview — status poller for a DocumentGenerationProcess.
 *
 * Waits (client-side, no flow loop / no DML) for an async document
 * generation to finish, then publishes the generated file IDs back to the
 * flow. Pair it on the SAME flow screen with the native File Preview
 * component, bound reactively to the `contentDocumentId` output.
 */
export default class DocGenPreview extends LightningElement {

    // ─── Flow Inputs ──────────────────────────────────────────────────────
    @api dgpId;
    @api cardTitle = 'Generated Document';

    // ─── Flow Outputs ─────────────────────────────────────────────────────
    @api contentDocumentId;   // 069 — wire this to the File Preview component
    @api contentVersionId;    // 068 — handy for a Download action elsewhere

    // ─── Internal State ───────────────────────────────────────────────────
    @track isLoading      = true;
    @track isComplete     = false;
    @track isError        = false;
    @track isTimedOut     = false;
    @track errorMessage   = '';
    @track elapsedSeconds = 0;

    _pollInterval  = null;
    _elapsedTicker = null;
    _attemptCount  = 0;

    // ─── Lifecycle ────────────────────────────────────────────────────────

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

    // ─── Polling ──────────────────────────────────────────────────────────

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
                this.publishResult(result);

            } else if (result.status === 'Failure') {
                this.stopPolling();
                this.stopElapsedTicker();
                this.showError(result.errorMessage);
            }
            // any other status → keep polling

        } catch (error) {
            // Transient errors are swallowed so a single failed poll doesn't
            // kill the loop; MAX_ATTEMPTS still bounds the wait.
            // eslint-disable-next-line no-console
            console.error('DocGenPreview poll error:', error);
        }
    }

    publishResult(result) {
        this.contentDocumentId = result.pdfContentDocumentId || null;
        this.contentVersionId  =
            result.pdfContentVersionId || result.docContentVersionId || null;

        // Push outputs to the flow so reactive components (File Preview) update.
        if (this.contentDocumentId) {
            this.dispatchEvent(
                new FlowAttributeChangeEvent('contentDocumentId', this.contentDocumentId)
            );
        }
        if (this.contentVersionId) {
            this.dispatchEvent(
                new FlowAttributeChangeEvent('contentVersionId', this.contentVersionId)
            );
        }

        this.isLoading  = false;
        this.isComplete = true;
    }

    // ─── Elapsed Timer ────────────────────────────────────────────────────

    startElapsedTicker() {
        this._elapsedTicker = setInterval(() => this.elapsedSeconds++, 1000);
    }

    stopElapsedTicker() {
        if (this._elapsedTicker) {
            clearInterval(this._elapsedTicker);
            this._elapsedTicker = null;
        }
    }

    // ─── Handlers ─────────────────────────────────────────────────────────

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

    // ─── Helpers ──────────────────────────────────────────────────────────

    showError(message) {
        this.stopPolling();
        this.stopElapsedTicker();
        this.isLoading    = false;
        this.isError      = true;
        this.errorMessage = message || 'An unexpected error occurred.';
    }
}
