<?php
namespace CaptchaEU\CaptchaEU\FormElements;

use Neos\Flow\Annotations as Flow;
use Neos\Error\Messages\Error;
use Neos\Form\Core\Model\AbstractFormElement;
use Neos\Form\Core\Runtime\FormRuntime;

class Captcha extends AbstractFormElement
{
    /**
     * @Flow\InjectConfiguration()
     * @var array
     */
    protected $settings = [];

    /**
     * Check the captcha solution before submitting form.
     *
     * @param FormRuntime $formRuntime The current form runtime
     * @param mixed       $elementValue The transmitted value of the form field.
     */
    public function onSubmit(FormRuntime $formRuntime, &$elementValue)
    {
        $properties = $this->getProperties();
        $restKey = null;
        foreach ([
            $properties['overrideRestKey'] ?? null,
            $properties['restKey'] ?? null,
            $this->settings['restKey'] ?? null,
        ] as $candidate) {
            if (is_string($candidate) && trim($candidate) !== '') {
                $restKey = trim($candidate);
                break;
            }
        }

        if ($restKey === null) {
            $this->addValidationError('Error. Please try again later.', 17942348245);
            return;
        }

        $solution = $_POST['captcha_at_solution'] ?? '';

        if (!is_string($solution) || $solution === '') {
            $this->addValidationError('You forgot to add the solution parameter.', 1515642243);
            return;
        }

        if (!$this->checkSolution($solution, $restKey)) {
            $this->addValidationError('Captcha verification failed. Please try again.', 1380742852);
        }
    }

    public function checkSolution($solution, $restKey): bool
    {
        if (
            !is_string($solution) || trim($solution) === ''
            || !is_string($restKey) || trim($restKey) === ''
        ) {
            return false;
        }

        $ch = curl_init('https://w19.captcha.at/validate');

        if ($ch === false) {
            return false;
        }

        curl_setopt_array($ch, [
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => $solution,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json',
                'Rest-Key: ' . $restKey,
            ],
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_TIMEOUT => 20,
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);

        if ($response === false || $httpCode !== 200) {
            return false;
        }

        $result = json_decode($response, true);

        return is_array($result) && ($result['success'] ?? false) === true;
    }

    private function addValidationError(string $message, int $code): void
    {
        $this->getRootForm()
            ->getProcessingRule($this->getIdentifier())
            ->getProcessingMessages()
            ->addError(new Error($message, $code));
    }
}