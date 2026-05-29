/**
 * DocGenPreviewControllerTest
 * Unit tests for DocGenPreviewController.
 */
@isTest
private class DocGenPreviewControllerTest {

    /**
     * Tests getDGPStatus returns an error gracefully when DGP Id is invalid.
     */
    @isTest
    static void testGetDGPStatus_invalidId_returnsError() {
        Test.startTest();
        DocGenPreviewController.DGPStatusResult result =
            DocGenPreviewController.getDGPStatus('invalid_id');
        Test.stopTest();

        System.assertEquals('Error', result.status);
        System.assertNotEquals(null, result.errorMessage);
    }

    /**
     * Tests getDGPStatus returns an error gracefully when DGP Id is null.
     */
    @isTest
    static void testGetDGPStatus_nullId_returnsError() {
        Test.startTest();
        DocGenPreviewController.DGPStatusResult result =
            DocGenPreviewController.getDGPStatus(null);
        Test.stopTest();

        System.assertEquals('Error', result.status);
        System.assertNotEquals(null, result.errorMessage);
    }

    /**
     * Tests getDGPStatus returns an error gracefully when DGP Id does not exist.
     */
    @isTest
    static void testGetDGPStatus_nonExistentId_returnsError() {
        Test.startTest();
        DocGenPreviewController.DGPStatusResult result =
            DocGenPreviewController.getDGPStatus('a00000000000000AAA');
        Test.stopTest();

        System.assertEquals('Error', result.status);
        System.assertNotEquals(null, result.errorMessage);
    }
}
