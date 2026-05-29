/**
 * DocGenPreviewController
 *
 * AuraEnabled controller for the docGenPreview LWC screen component.
 * Polls a DocumentGenerationProcess record by Id and returns its
 * current status + generated ContentVersion IDs back to the component.
 */
public with sharing class DocGenPreviewController {

    // ─── Result Wrapper ──────────────────────────────────────────────────────

    public class DGPStatusResult {
        @AuraEnabled public String status;
        @AuraEnabled public String pdfContentVersionId;
        @AuraEnabled public String docContentVersionId;
        @AuraEnabled public String pdfContentDocumentId;
        @AuraEnabled public String errorMessage;
    }

    // ─── AuraEnabled: Poll DGP Status ────────────────────────────────────────

    /**
     * Called by the docGenPreview LWC on a setInterval polling loop.
     * Returns Status and ContentVersionIds once generation completes.
     * cacheable=false required — status changes after record creation.
     */
    @AuraEnabled(cacheable=false)
    public static DGPStatusResult getDGPStatus(String dgpId) {
        DGPStatusResult result = new DGPStatusResult();

        try {
            DocumentGenerationProcess dgp = [
                SELECT Status, ResponseText
                FROM DocumentGenerationProcess
                WHERE Id = :dgpId
                LIMIT 1
            ];

            result.status = dgp.Status;

            if (dgp.Status == 'Success' && String.isNotBlank(dgp.ResponseText)) {
                try {
                    // ResponseText is JSON: {"pdfContentVersionId":"...","docContentVersionId":"..."}
                    Map<String, Object> responseMap =
                        (Map<String, Object>) JSON.deserializeUntyped(dgp.ResponseText);

                    result.pdfContentVersionId =
                        (String) responseMap.get('pdfContentVersionId');
                    result.docContentVersionId =
                        (String) responseMap.get('docContentVersionId');

                } catch (Exception parseEx) {
                    // Fallback — ResponseText may be a raw ContentVersionId string
                    result.pdfContentVersionId = dgp.ResponseText;
                }

                // Resolve ContentDocumentId (069) from ContentVersionId (068)
                // NavigationMixin filePreview requires ContentDocumentId not ContentVersionId
                if (String.isNotBlank(result.pdfContentVersionId)) {
                    try {
                        ContentVersion cv = [
                            SELECT ContentDocumentId
                            FROM ContentVersion
                            WHERE Id = :result.pdfContentVersionId
                            LIMIT 1
                        ];
                        result.pdfContentDocumentId = cv.ContentDocumentId;
                    } catch (Exception cvEx) {
                        // Leave null — LWC will fall back to ContentVersionId
                    }
                }
            }

            if (dgp.Status == 'Failure') {
                result.errorMessage = String.isNotBlank(dgp.ResponseText)
                    ? dgp.ResponseText
                    : 'Document generation failed. Please try again.';
            }

        } catch (Exception e) {
            result.status       = 'Error';
            result.errorMessage = 'Unable to retrieve document status: ' + e.getMessage();
        }

        return result;
    }
}
