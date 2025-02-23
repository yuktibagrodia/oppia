// Copyright 2021 The Oppia Authors. All Rights Reserved.
//
// Licensed under the Apache License, Version 2.0 (the "License");
// you may not use this file except in compliance with the License.
// You may obtain a copy of the License at
//
//      http://www.apache.org/licenses/LICENSE-2.0
//
// Unless required by applicable law or agreed to in writing, software
// distributed under the License is distributed on an "AS-IS" BASIS,
// WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
// See the License for the specific language governing permissions and
// limitations under the License.

/**
 * @fileoverview Component for a blog dashboard card.
 */

interface EditorSchema {
  type: string,
  'ui_config': object
}

import { ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { downgradeComponent } from '@angular/upgrade/static';
import { AlertsService } from 'services/alerts.service';
import { BlogPostEditorData, BlogPostEditorBackendApiService } from 'domain/blog/blog-post-editor-backend-api.service';
import { BlogPostUpdateService } from 'domain/blog/blog-post-update.service';
import { BlogDashboardPageConstants } from 'pages/blog-dashboard-page/blog-dashboard-page.constants';
import { BlogDashboardPageService } from 'pages/blog-dashboard-page/services/blog-dashboard-page.service';
import { BlogPostData } from 'domain/blog/blog-post.model';
import { UrlInterpolationService } from 'domain/utilities/url-interpolation.service';
import { LoaderService } from 'services/loader.service';
import { AppConstants } from 'app.constants';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { BlogPostActionConfirmationModalComponent } from 'pages/blog-dashboard-page/blog-post-action-confirmation/blog-post-action-confirmation.component';
import { UploadBlogPostThumbnailModalComponent } from 'pages/blog-dashboard-page/modal-templates/upload-blog-post-thumbnail-modal.component';
import { ImageLocalStorageService } from 'services/image-local-storage.service';
import { AssetsBackendApiService } from 'services/assets-backend-api.service';
import { ContextService } from 'services/context.service';
import dayjs from 'dayjs';
import { WindowDimensionsService } from 'services/contextual/window-dimensions.service';
import { BlogCardPreviewModalComponent } from 'pages/blog-dashboard-page/modal-templates/blog-card-preview-modal.component';
import { PreventPageUnloadEventService } from 'services/prevent-page-unload-event.service';
@Component({
  selector: 'oppia-blog-post-editor',
  templateUrl: './blog-post-editor.component.html'
})
export class BlogPostEditorComponent implements OnInit {
  blogPostData: BlogPostData;
  blogPostId: string;
  authorProfilePictureUrl: string;
  uploadedImageDataUrl: string;
  DEFAULT_PROFILE_PICTURE_URL: string = '';
  dateTimeLastSaved: string = '';
  authorUsername: string = '';
  title: string;
  windowIsNarrow: boolean;
  defaultTagsList: string[];
  maxAllowedTags: number;
  contentEditorIsActive: boolean = true;
  localEditedContent: string;
  thumbnailDataUrl: string;
  invalidImageWarningIsShown: boolean = false;
  newChangesAreMade: boolean = false;
  lastChangesWerePublished: boolean = false;
  MAX_CHARS_IN_BLOG_POST_TITLE: number;
  MIN_CHARS_IN_BLOG_POST_TITLE: number;
  HTML_SCHEMA: EditorSchema = {
    type: 'html',
    ui_config: {
      hide_complex_extensions: false
    }
  };

  constructor(
    private alertsService: AlertsService,
    private assetsBackendApiService: AssetsBackendApiService,
    private blogDashboardPageService: BlogDashboardPageService,
    private blogPostEditorBackendService: BlogPostEditorBackendApiService,
    private blogPostUpdateService: BlogPostUpdateService,
    private changeDetectorRef: ChangeDetectorRef,
    private contextService: ContextService,
    private imageLocalStorageService: ImageLocalStorageService,
    private loaderService: LoaderService,
    private ngbModal: NgbModal,
    private urlInterpolationService: UrlInterpolationService,
    private windowDimensionService: WindowDimensionsService,
    private preventPageUnloadEventService: PreventPageUnloadEventService,
  ) {}

  ngOnInit(): void {
    this.loaderService.showLoadingScreen('Loading');
    this.DEFAULT_PROFILE_PICTURE_URL = this.urlInterpolationService
      .getStaticImageUrl('/general/no_profile_picture.png');
    this.blogPostData = BlogPostData.createInterstitialBlogPost();
    this.blogPostId = this.blogDashboardPageService.blogPostId;
    this.title = this.blogPostData.title;
    this.MAX_CHARS_IN_BLOG_POST_TITLE = (
      AppConstants.MAX_CHARS_IN_BLOG_POST_TITLE);
    this.MIN_CHARS_IN_BLOG_POST_TITLE = (
      AppConstants.MIN_CHARS_IN_BLOG_POST_TITLE);
    this.loaderService.hideLoadingScreen();
    this.initEditor();
    this.contextService.setImageSaveDestinationToLocalStorage();
    this.windowIsNarrow = this.windowDimensionService.isWindowNarrow();
    this.windowDimensionService.getResizeEvent().subscribe(() => {
      this.windowIsNarrow = this.windowDimensionService.isWindowNarrow();
      if (this.windowIsNarrow && this.uploadedImageDataUrl) {
        this.blogDashboardPageService.imageUploaderIsNarrow = true;
      }
    });
  }

  getSchema(): EditorSchema {
    return this.HTML_SCHEMA;
  }

  initEditor(): void {
    this.blogPostEditorBackendService.fetchBlogPostEditorData(this.blogPostId)
      .then(
        (editorData: BlogPostEditorData) => {
          this.blogPostData = editorData.blogPostDict;
          this.authorProfilePictureUrl = decodeURIComponent((
            // eslint-disable-next-line max-len
            editorData.profilePictureDataUrl || this.DEFAULT_PROFILE_PICTURE_URL));
          this.authorUsername = editorData.username;
          this.defaultTagsList = editorData.listOfDefaulTags;
          this.maxAllowedTags = editorData.maxNumOfTags;
          this.title = this.blogPostData.title;
          this.dateTimeLastSaved = this.getDateStringInWords(
            this.blogPostData.lastUpdated);
          if (this.blogPostData.content.length > 0) {
            this.contentEditorIsActive = false;
          }
          if (this.blogPostData.thumbnailFilename) {
            this.thumbnailDataUrl = this.assetsBackendApiService
              .getThumbnailUrlForPreview(
                AppConstants.ENTITY_TYPE.BLOG_POST, this.blogPostId,
                this.blogPostData.thumbnailFilename);
            if (this.windowIsNarrow) {
              this.blogDashboardPageService.imageUploaderIsNarrow = true;
            }
          }
          if (this.blogPostData.lastUpdated === this.blogPostData.publishedOn) {
            this.lastChangesWerePublished = true;
          }
          this.blogDashboardPageService.setNavTitle(
            this.lastChangesWerePublished, this.title);
          this.newChangesAreMade = false;
        }, (errorResponse) => {
          if (
            AppConstants.FATAL_ERROR_CODES.indexOf(
              errorResponse) !== -1) {
            this.alertsService.addWarning(
              'Failed to get Blog Post Data. The Blog Post was either' +
              ' deleted or the Blog Post ID is invalid.');
            this.blogDashboardPageService.navigateToMainTab();
          }
        });
  }

  getDateStringInWords(naiveDateTime: string): string {
    let datestring = naiveDateTime.substring(0, naiveDateTime.length - 7);
    return dayjs(
      datestring, 'MM-DD-YYYY, HH:mm:ss').format('MMMM D, YYYY [at] hh:mm A');
  }

  updateLocalTitleValue(): void {
    this.blogPostUpdateService.setBlogPostTitle(
      this.blogPostData, this.title);
    this.newChangesAreMade = true;
    this.blogDashboardPageService.setNavTitle(
      this.lastChangesWerePublished, this.title);
    this.preventPageUnloadEventService.addListener();
  }

  cancelEdit(): void {
    if (this.blogPostData.content.length > 0) {
      this.contentEditorIsActive = false;
    }
  }

  updateLocalEditedContent($event: string): void {
    if (this.localEditedContent !== $event) {
      this.localEditedContent = $event;
      this.changeDetectorRef.detectChanges();
    }
  }

  updateContentValue(): void {
    this.blogPostUpdateService.setBlogPostContent(
      this.blogPostData, this.localEditedContent);
    if (this.blogPostData.content.length > 0) {
      this.contentEditorIsActive = false;
    }
    this.newChangesAreMade = true;
    this.preventPageUnloadEventService.addListener();
  }

  saveDraft(): void {
    let issues = this.blogPostData.validate();
    if (issues.length === 0) {
      this.updateBlogPostData(false);
    } else {
      this.alertsService.addWarning(
        'Please fix the errors.'
      );
    }
  }

  headersAreEnabledCallBack(): boolean {
    return true;
  }

  publishBlogPost(): void {
    let issues = this.blogPostData.prepublishValidate(this.maxAllowedTags);
    if (issues.length === 0) {
      this.blogDashboardPageService.blogPostAction = (
        BlogDashboardPageConstants.BLOG_POST_ACTIONS.PUBLISH);
      this.ngbModal.open(BlogPostActionConfirmationModalComponent, {
        backdrop: 'static',
        keyboard: false,
      }).result.then(() => {
        this.updateBlogPostData(true);
      }, () => {
        // Note to developers:
        // This callback is triggered when the Cancel button is clicked.
        // No further action is needed.
      });
    }
  }

  updateBlogPostData(isBlogPostPublished: boolean): void {
    this.blogPostUpdateService.setBlogPostTags(
      this.blogPostData, this.blogPostData.tags);
    let changeDict = this.blogPostUpdateService.getBlogPostChangeDict();
    this.blogPostEditorBackendService.updateBlogPostDataAsync(
      this.blogPostId, isBlogPostPublished, changeDict).then(
      () => {
        if (isBlogPostPublished) {
          this.alertsService.addSuccessMessage(
            'Blog Post Saved and Published Succesfully.'
          );
          this.lastChangesWerePublished = true;
        } else {
          this.alertsService.addSuccessMessage(
            'Blog Post Saved Succesfully.');
          this.lastChangesWerePublished = false;
        }
        this.newChangesAreMade = false;
        this.blogDashboardPageService.setNavTitle(
          this.lastChangesWerePublished, this.title);
        this.preventPageUnloadEventService.removeListener();
      }, (errorResponse) => {
        this.alertsService.addWarning(
          `Failed to save Blog Post. Internal Error: ${errorResponse}`);
      }
    );
  }

  postImageDataToServer(): void {
    let imagesData = this.imageLocalStorageService.getStoredImagesData();
    this.blogPostUpdateService.setBlogPostThumbnail(
      this.blogPostData, imagesData);
    this.blogPostEditorBackendService.postThumbnailDataAsync(
      this.blogPostId, imagesData).then(
      () => {
        if (this.windowIsNarrow) {
          this.blogDashboardPageService.imageUploaderIsNarrow = true;
        }
        this.alertsService.addSuccessMessage(
          'Thumbnail Saved Successfully.');
      }, (errorResponse) => {
        this.alertsService.addWarning(
          `Failed to save thumbnail data. Internal Error: ${errorResponse}`
        );
        this.imageLocalStorageService.flushStoredImagesData();
        this.thumbnailDataUrl = '';
      });
  }

  deleteBlogPost(): void {
    this.blogDashboardPageService.blogPostAction = 'delete';
    this.ngbModal.open(BlogPostActionConfirmationModalComponent, {
      backdrop: 'static',
      keyboard: false,
    }).result.then(() => {
      this.blogDashboardPageService.deleteBlogPost();
    }, () => {
      // Note to developers:
      // This callback is triggered when the Cancel button is clicked.
      // No further action is needed.
    });
  }

  onTagChange(tag: string): void {
    if ((this.blogPostData.tags).includes(tag)) {
      this.blogPostData.removeTag(tag);
    } else if ((this.blogPostData.tags).length < this.maxAllowedTags) {
      this.blogPostData.addTag(tag);
    }
    this.newChangesAreMade = true;
    this.preventPageUnloadEventService.addListener();
  }

  showuploadThumbnailModal(): void {
    let modalRef = this.ngbModal.open(UploadBlogPostThumbnailModalComponent, {
      backdrop: 'static'
    });

    modalRef.result.then((imageDataUrl) => {
      this.saveBlogPostThumbnail(imageDataUrl);
    }, () => {
      // Note to developers:
      // This callback is triggered when the Cancel button is clicked.
      // No further action is needed.
    });
  }

  saveBlogPostThumbnail(thumbnailDataUrl: string): void {
    this.thumbnailDataUrl = thumbnailDataUrl;
    this.postImageDataToServer();
    this.newChangesAreMade = true;
    this.preventPageUnloadEventService.addListener();
  }

  showPreview(): void {
    this.blogDashboardPageService.blogPostData = this.blogPostData;
    this.blogDashboardPageService.authorPictureUrl = (
      this.authorProfilePictureUrl);
    this.ngbModal.open(BlogCardPreviewModalComponent, {
      backdrop: 'static'
    });
  }

  isPublishButtonDisabled(): boolean {
    if (this.blogPostData.prepublishValidate(this.maxAllowedTags).length > 0) {
      return true;
    } else if (this.newChangesAreMade) {
      return false;
    } else if (!this.lastChangesWerePublished) {
      return false;
    } else {
      return true;
    }
  }
}

angular.module('oppia').directive('oppiaBlogPostEditor',
    downgradeComponent({
      component: BlogPostEditorComponent
    }) as angular.IDirectiveFactory);
